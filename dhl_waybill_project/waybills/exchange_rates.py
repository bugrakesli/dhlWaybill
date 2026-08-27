import urllib.request
import urllib.error
import json
import xml.etree.ElementTree as ET
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from .models import ExchangeRateCache

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def _parse_tcmb_xml(xml_content, currency="EUR"):
    """
    TCMB XML içeriğinden belirtilen para biriminin ForexSelling (veya BanknoteSelling) kurunu ayıklar.
    """
    root = ET.fromstring(xml_content)
    currency_code = currency.upper()

    for curr in root.findall("Currency"):
        kod = curr.attrib.get("Kod") or curr.attrib.get("CurrencyCode")
        if kod == currency_code:
            # Öncelik: ForexSelling -> BanknoteSelling -> ForexBuying
            forex_selling = curr.findtext("ForexSelling")
            banknote_selling = curr.findtext("BanknoteSelling")
            forex_buying = curr.findtext("ForexBuying")

            val_str = forex_selling or banknote_selling or forex_buying
            if val_str:
                val_str = val_str.strip().replace(",", ".")
                try:
                    return round(Decimal(val_str), 4)
                except (InvalidOperation, ValueError):
                    return None
    return None


def fetch_from_tcmb(target_date, currency="EUR", max_lookback_days=10):
    """
    Belirtilen tarih için TCMB'den kur çeker.
    Hafta sonu veya tatil nedeniyle bülten yoksa geriye doğru arar (en son iş günü bülteni).
    """
    curr_date = target_date
    today = date.today()

    for _ in range(max_lookback_days):
        if curr_date > today:
            curr_date = today

        # TCMB URL formatı: https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml
        # Bugünün bülteni için today.xml de geçerlidir.
        if curr_date == today:
            url = "https://www.tcmb.gov.tr/kurlar/today.xml"
        else:
            year_month = curr_date.strftime("%Y%m")
            day_month_year = curr_date.strftime("%d%m%Y")
            url = f"https://www.tcmb.gov.tr/kurlar/{year_month}/{day_month_year}.xml"

        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    xml_content = response.read()
                    rate = _parse_tcmb_xml(xml_content, currency=currency)
                    if rate is not None:
                        return rate, curr_date, "TCMB"
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            # 404 (hafta sonu / tatil) veya bağlantı hatası durumunda bir önceki güne bak
            pass

        curr_date -= timedelta(days=1)

    return None, None, None


def fetch_from_frankfurter(target_date, currency="EUR"):
    """
    TCMB'ye ulaşılamadığı durumlarda Avrupa Merkez Bankası (ECB) verilerini sunan
    ücretsiz ve limitsiz Frankfurter API'sini yedek olarak kullanır.
    """
    date_str = target_date.strftime("%Y-%m-%d")
    url = f"https://api.frankfurter.dev/v1/{date_str}?from={currency.upper()}&to=TRY"

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                rate_val = data.get("rates", {}).get("TRY")
                actual_date_str = data.get("date")
                actual_date = date.fromisoformat(actual_date_str) if actual_date_str else target_date

                if rate_val is not None:
                    return round(Decimal(str(rate_val)), 4), actual_date, "ECB"
    except Exception:
        pass

    return None, None, None


def get_exchange_rate(target_date, currency="EUR"):
    """
    Verilen tarih ve para birimi için döviz kurunu döner.
    1. Önbelleğe (ExchangeRateCache) bakar.
    2. TCMB XML servisinden çeker (tatil/hafta sonu toleranslı).
    3. Gerekirse ECB/Frankfurter API'ye yedek olarak danışır.
    4. Sonucu önbelleğe kaydeder.
    
    Dönüş:
        {
            "rate": Decimal("35.9146"),
            "target_date": target_date,
            "actual_date": actual_date,
            "currency": currency,
            "source": "TCMB" | "ECB"
        } veya None
    """
    if not isinstance(target_date, date):
        return None

    currency = currency.upper()

    # 1) Veritabanı önbelleğini kontrol et
    cached = ExchangeRateCache.objects.filter(
        rate_date=target_date,
        currency=currency,
    ).first()

    if cached:
        return {
            "rate": cached.rate,
            "target_date": cached.rate_date,
            "actual_date": cached.actual_bulletin_date or cached.rate_date,
            "currency": cached.currency,
            "source": cached.source,
        }

    # 2) TCMB'den çek
    rate, actual_date, source = fetch_from_tcmb(target_date, currency=currency)

    # 3) Yedek servis (ECB)
    if rate is None:
        rate, actual_date, source = fetch_from_frankfurter(target_date, currency=currency)

    # 4) Başarılıysa veritabanına kaydet
    if rate is not None:
        ExchangeRateCache.objects.update_or_create(
            rate_date=target_date,
            currency=currency,
            defaults={
                "actual_bulletin_date": actual_date,
                "rate": rate,
                "source": source,
            },
        )
        return {
            "rate": rate,
            "target_date": target_date,
            "actual_date": actual_date,
            "currency": currency,
            "source": source,
        }

    return None
