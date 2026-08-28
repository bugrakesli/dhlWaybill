import io
import pandas as pd
from datetime import date
from decimal import Decimal
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from .models import Waybill
from .serializers import WaybillSerializer


class WaybillModelTests(TestCase):
    def test_payment_amount_calculation(self):
        waybill = Waybill.objects.create(
            waybill_number="AWB12345678",
            shipment_date=date(2026, 6, 1),
            sender="Test Sender",
            destination="Almanya",
            piece_count=3,
            collected_by="Ahmet",
            delivered=True,
            receiver="Test Receiver",
            euro_amount=Decimal("150.50"),
            exchange_rate=Decimal("35.5000"),
        )
        # 150.50 * 35.50 = 5342.75
        self.assertEqual(waybill.payment_amount, Decimal("5342.75"))

    def test_payment_amount_explicit_override(self):
        waybill = Waybill.objects.create(
            waybill_number="AWB_EXPLICIT",
            shipment_date=date(2026, 6, 1),
            euro_amount=Decimal("100.00"),
            exchange_rate=Decimal("35.0000"),
            payment_amount=Decimal("4000.00"),  # Manuel/Excel'den özel girilen değer
        )
        self.assertEqual(waybill.payment_amount, Decimal("4000.00"))

    def test_payment_amount_none_when_missing(self):
        waybill = Waybill.objects.create(
            waybill_number="AWB999",
            shipment_date=date(2026, 6, 1),
            euro_amount=None,
            exchange_rate=Decimal("35.5000"),
        )
        self.assertIsNone(waybill.payment_amount)

    def test_is_incomplete_property(self):
        complete_wb = Waybill.objects.create(
            waybill_number="AWB100",
            shipment_date=date(2026, 6, 1),
            sender="Firma",
            destination="Almanya",
            piece_count=1,
            weight=Decimal("2.50"),
            collected_by="Kurye",
            delivered=True,
            receiver="Alici",
            euro_amount=Decimal("100.00"),
            exchange_rate=Decimal("35.0000"),
        )
        self.assertFalse(complete_wb.is_incomplete)

        missing_weight_wb = Waybill.objects.create(
            waybill_number="AWB_NO_WEIGHT",
            shipment_date=date(2026, 6, 1),
            sender="Firma",
            destination="Almanya",
            piece_count=1,
            weight=None,
            collected_by="Kurye",
            delivered=True,
            receiver="Alici",
            euro_amount=Decimal("100.00"),
            exchange_rate=Decimal("35.0000"),
        )
        self.assertTrue(missing_weight_wb.is_incomplete)

        incomplete_wb = Waybill.objects.create(
            waybill_number="AWB101",
            shipment_date=date(1900, 1, 1),
            sender="-",
            destination="-",
            piece_count=None,
            weight=None,
            collected_by="-",
            delivered=False,
            receiver="-",
            euro_amount=None,
            exchange_rate=None,
        )
        self.assertTrue(incomplete_wb.is_incomplete)


class WaybillAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.w1 = Waybill.objects.create(
            waybill_number="AWB1001",
            shipment_date=date(2026, 6, 10),
            sender="Firma A",
            destination="Almanya",
            piece_count=2,
            weight=Decimal("10.50"),
            collected_by="Kurye 1",
            delivered=True,
            receiver="Alıcı X",
            euro_amount=Decimal("100.00"),
            exchange_rate=Decimal("35.0000"),
        )
        self.w2 = Waybill.objects.create(
            waybill_number="AWB1002",
            shipment_date=date(2026, 6, 20),
            sender="Firma B",
            destination="Fransa",
            piece_count=5,
            weight=Decimal("15.50"),
            collected_by="Kurye 2",
            delivered=False,
            receiver="Alıcı Y",
            euro_amount=Decimal("200.00"),
            exchange_rate=Decimal("35.0000"),
        )
        self.w_incomplete = Waybill.objects.create(
            waybill_number="AWB1003",
            shipment_date=date(1900, 1, 1),
            sender="-",
            destination="-",
            piece_count=None,
            weight=None,
            collected_by="-",
            delivered=False,
            receiver="-",
            euro_amount=None,
            exchange_rate=None,
        )

    def test_list_and_summary(self):
        response = self.client.get("/api/waybills/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(response.data["total_pages"], 1)
        self.assertEqual(response.data["current_page"], 1)
        self.assertEqual(response.data["page_size"], 25)
        summary = response.data["summary"]
        self.assertEqual(summary["total_count"], 3)
        self.assertEqual(summary["total_pieces"], 7)
        self.assertEqual(summary["total_euro"], 300.0)
        self.assertEqual(summary["total_weight"], 26.0)
        self.assertEqual(summary["delivered_count"], 1)

    def test_custom_page_size_pagination(self):
        response = self.client.get("/api/waybills/?page=1&page_size=2")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(response.data["total_pages"], 2)
        self.assertEqual(response.data["current_page"], 1)
        self.assertEqual(response.data["page_size"], 2)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertIsNotNone(response.data["next"])

    def test_filter_delivered(self):
        response = self.client.get("/api/waybills/?delivered=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["waybill_number"], "AWB1001")

        response = self.client.get("/api/waybills/?delivered=false")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_incomplete(self):
        response = self.client.get("/api/waybills/?incomplete=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["waybill_number"], "AWB1003")

    def test_filter_incomplete_missing_weight(self):
        # Yalnızca ağırlığı eksik olan bir kayıt oluşturalım
        Waybill.objects.create(
            waybill_number="AWB_WEIGHT_EMPTY",
            shipment_date=date(2026, 6, 15),
            sender="Firma C",
            destination="Almanya",
            piece_count=2,
            weight=None,
            collected_by="Kurye 3",
            delivered=True,
            receiver="Alıcı Z",
            euro_amount=Decimal("150.00"),
            exchange_rate=Decimal("35.0000"),
        )
        response = self.client.get("/api/waybills/?incomplete=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        waybill_numbers = [r["waybill_number"] for r in response.data["results"]]
        self.assertIn("AWB_WEIGHT_EMPTY", waybill_numbers)
        self.assertIn("AWB1003", waybill_numbers)

    def test_excel_upload_turkish_headers(self):
        df = pd.DataFrame([
            {
                "TARİH": "2026-06-15",
                "AWB": "AWB2001",
                "GÖNDERİCİ FİRMA/ŞAHIS": "Yeni Gönderici",
                "ÜLKE-VARIŞ NOKTASI": "İtalya",
                "PARÇA": 4,
                "AĞIRLIK": "12,75",
                "TOPLAYAN": "Ali",
                "TESLİM EDİLDİ": "Evet",
                "ALICI FIRMA/ŞAHIS": "Yeni Alıcı",
                "EURO": "125,50",
                "KUR": "36,2000",
            },
            {
                "TARİH": "",
                "AWB": "AWB2002",
                "GÖNDERİCİ FİRMA/ŞAHIS": "",
                "ÜLKE-VARIŞ NOKTASI": "",
                "PARÇA": "",
                "AĞIRLIK": "",
                "TOPLAYAN": "",
                "TESLİM EDİLDİ": "Hayır",
                "ALICI FIRMA/ŞAHIS": "",
                "EURO": "",
                "KUR": "",
            }
        ])
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine="openpyxl")
        buffer.seek(0)

        uploaded_file = SimpleUploadedFile(
            "test_upload.xlsx",
            buffer.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        response = self.client.post(
            "/api/waybills/upload/",
            {"file": uploaded_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["created"], 2)

        wb1 = Waybill.objects.get(waybill_number="AWB2001")
        self.assertEqual(wb1.destination, "İtalya")
        self.assertEqual(wb1.piece_count, 4)
        self.assertEqual(wb1.weight, Decimal("12.75"))
        self.assertTrue(wb1.delivered)
        self.assertEqual(wb1.euro_amount, Decimal("125.50"))
        self.assertEqual(wb1.exchange_rate, Decimal("36.2000"))

        wb2 = Waybill.objects.get(waybill_number="AWB2002")
        self.assertEqual(wb2.sender, "-")
        self.assertFalse(wb2.delivered)
        self.assertIsNone(wb2.piece_count)
        self.assertIsNone(wb2.weight)
        self.assertIsNone(wb2.euro_amount)

    def test_excel_upload_euro_and_kur_symbols(self):
        df = pd.DataFrame([
            {
                "AWB": "AWB_SYMBOL_1",
                "EURO (€)": "68.25€",
                "KUR (₺)": "37.24₺",
            },
            {
                "AWB": "AWB_SYMBOL_2",
                "EURO (€)": "76.65€",
                "KUR (₺)": "37.05€",
            }
        ])
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine="openpyxl")
        buffer.seek(0)

        uploaded_file = SimpleUploadedFile(
            "test_symbols.xlsx",
            buffer.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        response = self.client.post(
            "/api/waybills/upload/",
            {"file": uploaded_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["created"], 2)

        wb1 = Waybill.objects.get(waybill_number="AWB_SYMBOL_1")
        self.assertEqual(wb1.euro_amount, Decimal("68.25"))
        self.assertEqual(wb1.exchange_rate, Decimal("37.2400"))
        self.assertEqual(wb1.payment_amount, Decimal("2541.63"))

        wb2 = Waybill.objects.get(waybill_number="AWB_SYMBOL_2")
        self.assertEqual(wb2.euro_amount, Decimal("76.65"))
        self.assertEqual(wb2.exchange_rate, Decimal("37.0500"))
        self.assertEqual(wb2.payment_amount, Decimal("2839.88"))

    def test_export_view(self):
        response = self.client.get("/api/waybills/export/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )


class ExchangeRateTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_exchange_rate_cache_and_api(self):
        from .models import ExchangeRateCache

        # Manuel önbellek kaydı oluştur
        ExchangeRateCache.objects.create(
            rate_date=date(2026, 6, 15),
            actual_bulletin_date=date(2026, 6, 15),
            currency="EUR",
            rate=Decimal("36.5000"),
            source="TCMB",
        )

        response = self.client.get("/api/waybills/exchange-rate/?date=2026-06-15&currency=EUR")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["rate"], 36.5)
        self.assertEqual(response.data["currency"], "EUR")
        self.assertEqual(response.data["source"], "TCMB")

    def test_exchange_rate_missing_date_param(self):
        response = self.client.get("/api/waybills/exchange-rate/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_excel_upload_auto_fills_exchange_rate(self):
        from .models import ExchangeRateCache

        ExchangeRateCache.objects.create(
            rate_date=date(2026, 7, 10),
            actual_bulletin_date=date(2026, 7, 10),
            currency="EUR",
            rate=Decimal("37.1234"),
            source="TCMB",
        )

        df = pd.DataFrame([
            {
                "TARİH": "2026-07-10",
                "AWB": "AWB_AUTO_RATE_1",
                "GÖNDERİCİ": "Test Firma",
                "ÜLKE": "Almanya",
                "PARÇA": 1,
                "AĞIRLIK": "5",
                "EURO": "100.00",
                "KUR": "",  # Kur boş bırakıldı -> otomatik dolmalı
            }
        ])
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine="openpyxl")
        buffer.seek(0)

        uploaded_file = SimpleUploadedFile(
            "test_auto_rate.xlsx",
            buffer.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        response = self.client.post(
            "/api/waybills/upload/",
            {"file": uploaded_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        wb = Waybill.objects.get(waybill_number="AWB_AUTO_RATE_1")
        self.assertEqual(wb.exchange_rate, Decimal("37.1234"))
        self.assertEqual(wb.payment_amount, Decimal("3712.34"))

    def test_excel_upload_mixed_exchange_rates(self):
        """
        Excel'de kur değeri dolu olan satır tablodaki değeri kullanmalı,
        boş olan satır ise TCMB'den otomatik çekmelidir.
        """
        from .models import ExchangeRateCache

        # TCMB önbelleğine 2026-08-01 için kur ekleyelim
        ExchangeRateCache.objects.create(
            rate_date=date(2026, 8, 1),
            actual_bulletin_date=date(2026, 8, 1),
            currency="EUR",
            rate=Decimal("38.5000"),
            source="TCMB",
        )

        df = pd.DataFrame([
            {
                "TARİH": "2026-08-01",
                "AWB": "AWB_WITH_RATE",
                "EURO (€)": "100.00€",
                "KUR (₺)": "35.00₺",  # Tabloda açıkça belirtilen kur -> 35.00 kullanılmalı (TCMB'deki 38.50 değil)
            },
            {
                "TARİH": "2026-08-01",
                "AWB": "AWB_EMPTY_RATE",
                "EURO (€)": "100.00€",
                "KUR (₺)": "",        # Tabloda kur boş -> TCMB'den 38.50 çekilmeli
            }
        ])
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine="openpyxl")
        buffer.seek(0)

        uploaded_file = SimpleUploadedFile(
            "test_mixed_rates.xlsx",
            buffer.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        response = self.client.post(
            "/api/waybills/upload/",
            {"file": uploaded_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 1. Kayıt: Tablodaki 35.00 kuru aktarılmalı
        wb1 = Waybill.objects.get(waybill_number="AWB_WITH_RATE")
        self.assertEqual(wb1.exchange_rate, Decimal("35.0000"))
        self.assertEqual(wb1.payment_amount, Decimal("3500.00"))

        # 2. Kayıt: Boş olduğu için TCMB'deki 38.50 kuru aktarılmalı
        wb2 = Waybill.objects.get(waybill_number="AWB_EMPTY_RATE")
        self.assertEqual(wb2.exchange_rate, Decimal("38.5000"))
        self.assertEqual(wb2.payment_amount, Decimal("3850.00"))

    def test_excel_upload_payment_amount_priority(self):
        """
        Excel tablosunda 'ÖDEME TUTARI' sütunu varsa ve doluysa,
        uygulama Euro * Kur çarpımı yerine öncelikli olarak tablodaki tutarı kullanmalıdır.
        """
        df = pd.DataFrame([
            {
                "TARİH": "2026-08-01",
                "AWB": "AWB_EXPLICIT_PAYMENT_1",
                "EURO (€)": "68.25€",
                "KUR (₺)": "37.24€",
                "ÖDEME TUTARI": "2.542₺",  # Tablodan gelen öncelikli değer (68.25 * 37.24 = 2541.63 yerine)
            },
            {
                "TARİH": "2026-08-01",
                "AWB": "AWB_CALCULATED_PAYMENT_2",
                "EURO (€)": "100.00€",
                "KUR (₺)": "35.00₺",
                "ÖDEME TUTARI": "",        # Boş olduğu için 100 * 35 = 3500.00 hesaplanmalı
            }
        ])
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine="openpyxl")
        buffer.seek(0)

        uploaded_file = SimpleUploadedFile(
            "test_payment_priority.xlsx",
            buffer.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        response = self.client.post(
            "/api/waybills/upload/",
            {"file": uploaded_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 1. Kayıt: Tablodaki 2542.00 TL öncelikli alınmalı
        wb1 = Waybill.objects.get(waybill_number="AWB_EXPLICIT_PAYMENT_1")
        self.assertEqual(wb1.euro_amount, Decimal("68.25"))
        self.assertEqual(wb1.exchange_rate, Decimal("37.2400"))
        self.assertEqual(wb1.payment_amount, Decimal("2542.00"))

        # 2. Kayıt: Boş olduğu için hesaplanan 3500.00 TL kullanılmalı
        wb2 = Waybill.objects.get(waybill_number="AWB_CALCULATED_PAYMENT_2")
        self.assertEqual(wb2.payment_amount, Decimal("3500.00"))

    def test_excel_upload_dhl_billing_headers(self):
        df = pd.DataFrame([
            {
                "Relative Time Code": "W12",
                "Billing Year": 2026,
                "Billing Cycle": 1,
                "Main Product Category Code": "EXP",
                "Doc Category": "DOX",
                "Origin Country Code": "TR",
                "Destination Country Code": "DE",
                "Billing Account VAT Number": "1234567890",
                "Billing Account Number": "987654321",
                "Billing Account Name": "Test Account",
                "Billing Account Sales Territory": "IST",
                "Consignee Name": "Sample Receiver Ltd",
                "Consignee Contact Name": "John Doe",
                "Consignor Name": "Sample Sender A.S.",
                "Consignor Contact Name": "Jane Doe",
                "Invoice Number": "INV-2026-001",
                "Invoice Date": "2026-08-10",
                "Shipment Pick Up Date": "2026-08-05",
                "AWB Number": "AWB_DHL_001",
                "Billed Weight (Kg)": "5.5",
                "Total Revenue (EUR@BLFX)": "45.00",
                "Total Revenue (LCY)": "1650.00",
                "Base Revenue (EUR@BLFX)": "40.00",
                "Base Revenue (LCY)": "1500.00",
            }
        ])
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine="openpyxl")
        buffer.seek(0)

        uploaded_file = SimpleUploadedFile(
            "test_dhl_billing.xlsx",
            buffer.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        response = self.client.post(
            "/api/waybills/upload/",
            {"file": uploaded_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["created"], 1)

        wb = Waybill.objects.get(waybill_number="AWB_DHL_001")
        self.assertEqual(wb.sender, "Sample Sender A.S.")
        self.assertEqual(wb.receiver, "Sample Receiver Ltd")
        self.assertEqual(wb.destination, "DE")
        self.assertEqual(str(wb.shipment_date), "2026-08-05")
        self.assertEqual(wb.weight, Decimal("5.50"))
        self.assertEqual(wb.euro_amount, Decimal("45.00"))
        self.assertEqual(wb.payment_amount, Decimal("1650.00"))
        self.assertEqual(wb.billing_account_sales_territory, "IST")

    def test_territory_filtering_and_endpoint(self):
        Waybill.objects.create(
            waybill_number="AWB_BR1_1",
            shipment_date="2026-08-01",
            billing_account_sales_territory="BR1",
        )
        Waybill.objects.create(
            waybill_number="AWB_BR1_2",
            shipment_date="2026-08-02",
            billing_account_sales_territory="BR1",
        )
        Waybill.objects.create(
            waybill_number="AWB_IP1_1",
            shipment_date="2026-08-03",
            billing_account_sales_territory="IP1",
        )
        Waybill.objects.create(
            waybill_number="AWB_NO_BAST",
            shipment_date="2026-08-04",
            billing_account_sales_territory="",
        )

        # 1. Distinct territories endpoint
        resp_territories = self.client.get("/api/waybills/territories/")
        self.assertEqual(resp_territories.status_code, status.HTTP_200_OK)
        self.assertIn("BR1", resp_territories.data["territories"])
        self.assertIn("IP1", resp_territories.data["territories"])
        self.assertNotIn("", resp_territories.data["territories"])

        # 2. Filter by BR1
        resp_br1 = self.client.get("/api/waybills/?territory=BR1")
        self.assertEqual(resp_br1.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_br1.data["count"], 2)

        # 3. Filter by IP1
        resp_ip1 = self.client.get("/api/waybills/?territory=IP1")
        self.assertEqual(resp_ip1.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_ip1.data["count"], 1)

        # 4. Filter by None / BAST Olmayanlar
        resp_none = self.client.get("/api/waybills/?territory=none")
        self.assertEqual(resp_none.status_code, status.HTTP_200_OK)
        results = [r["waybill_number"] for r in resp_none.data["results"]]
        self.assertIn("AWB_NO_BAST", results)
        self.assertNotIn("AWB_BR1_1", results)

    def test_clear_all_waybills(self):
        Waybill.objects.create(waybill_number="AWB_DEL_1", shipment_date="2026-08-01")
        Waybill.objects.create(waybill_number="AWB_DEL_2", shipment_date="2026-08-02")
        self.assertEqual(Waybill.objects.count(), 2)

        response = self.client.post("/api/waybills/clear-all/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["deleted"], 2)
        self.assertEqual(Waybill.objects.count(), 0)





