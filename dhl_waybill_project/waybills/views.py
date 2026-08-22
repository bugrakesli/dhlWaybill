import re
import pandas as pd
from datetime import date
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.http import HttpResponse
from django.utils.dateparse import parse_date
from rest_framework import status, generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
import openpyxl
from openpyxl.styles import Font, PatternFill

from .models import Waybill
from .serializers import WaybillSerializer, WaybillExcelUploadSerializer
from .pagination import WaybillPagination

# Eksik veriyle gelen kayıtlar için kullanılan placeholder değerler.
# Hem upload (WaybillExcelUploadView) hem filtreleme (filter_waybills_queryset)
# aynı sabitleri kullanır -- iki yerde ayrı ayrı tanımlanıp zamanla
# farklılaşmasını önlemek için burada, modül seviyesinde tutuluyor.
PLACEHOLDER_DATE = date(1900, 1, 1)
PLACEHOLDER_TEXT = "-"


# --------------------------------------------------------------------------
# ORTAK YARDIMCI FONKSİYON: Filtreleme mantığı
# --------------------------------------------------------------------------

def filter_waybills_queryset(request):
    """
    start_date, end_date, status ve incomplete query parametrelerine göre
    Waybill queryset'ini filtreler. Hem WaybillListView (sayfalanmış listeleme)
    hem de WaybillExportView (tam Excel dışa aktarma) tarafından kullanılır.
    """
    queryset = Waybill.objects.all()

    start_date_param = request.query_params.get("start_date")
    end_date_param = request.query_params.get("end_date")
    status_param = request.query_params.get("status")
    incomplete_param = request.query_params.get("incomplete")

    start_date = parse_date(start_date_param) if start_date_param else None
    end_date = parse_date(end_date_param) if end_date_param else None

    if start_date:
        queryset = queryset.filter(shipment_date__gte=start_date)
    if end_date:
        queryset = queryset.filter(shipment_date__lte=end_date)

    if status_param:
        status_list = [s.strip().upper() for s in status_param.split(",") if s.strip()]
        valid_statuses = {choice[0] for choice in Waybill.StatusChoices.choices}
        status_list = [s for s in status_list if s in valid_statuses]
        if status_list:
            queryset = queryset.filter(status__in=status_list)

    # Eksik veri filtresi -- weight NULL, tarih placeholder, veya
    # gönderici/alıcı "-" olan kayıtları OR mantığıyla yakalar.
    if incomplete_param and incomplete_param.lower() == "true":
        queryset = queryset.filter(
            Q(weight__isnull=True)
            | Q(shipment_date=PLACEHOLDER_DATE)
            | Q(sender=PLACEHOLDER_TEXT)
            | Q(receiver=PLACEHOLDER_TEXT)
        )

    return queryset

# --------------------------------------------------------------------------
# 1) EXCEL YÜKLEME ENDPOINT'İ
# --------------------------------------------------------------------------

class WaybillExcelUploadView(APIView):
    """
    POST /api/waybills/upload/

    Excel (.xlsx) dosyasını okuyup Waybill kayıtlarını toplu olarak
    günceller (var olan waybill_number) veya oluşturur (yeni kayıt).

    Tek gerçekten zorunlu alan: waybill_number.
    shipment_date boşsa PLACEHOLDER_DATE (1900-01-01), weight boşsa/geçersizse
    None ("VERİ YOK"), sender/receiver boşsa "-" olarak kaydedilir.
    """
    parser_classes = [MultiPartParser, FormParser]

    # Excel dosyasında bulunması ZORUNLU olan tek sütun -- diğerleri
    # (shipment_date, status, sender, receiver, weight) hiç yoksa bile
    # dosya kabul edilir, eksik sütunlar otomatik fallback değerleriyle doldurulur.
    REQUIRED_COLUMNS = {"waybill_number"}

    # Excel'de var olması BEKLENEN ama zorunlu olmayan sütunlar -- dosyada
    # yoksa, aşağıda otomatik olarak boş (NaN) sütun olarak eklenir, böylece
    # satır işleme mantığı (row["shipment_date"] gibi erişimler) değişmeden çalışır.
    OPTIONAL_COLUMNS = {"shipment_date", "status", "sender", "receiver", "weight"}

    # Bu değerler hücrede görülürse "aslında boş" kabul edilir (case-insensitive)
    EMPTY_PLACEHOLDER_VALUES = {"", "NULL", "NAN", "N/A", "NA", "-", "NONE"}

    def _normalize_optional_field(self, raw_value, fallback="-"):
        """
        sender/receiver gibi opsiyonel alanlar için: hücre boşsa, NaN ise,
        veya "NULL"/"-"/"N/A" gibi bir placeholder içeriyorsa, fallback değeri döner.
        Aksi halde hücrenin temizlenmiş (strip edilmiş) halini döner.
        """
        if pd.isna(raw_value):
            return fallback

        value_str = str(raw_value).strip()

        if value_str.upper() in self.EMPTY_PLACEHOLDER_VALUES:
            return fallback

        return value_str

    def _normalize_waybill_number(self, raw_value):
        """
        Excel'den gelen konşimento numarasını normalize eder. pandas, tam sayı
        sütununda boş hücre (NaN) varsa tüm sütunu float'a çevirir -- bu yüzden
        1234567890 değeri "1234567890.0" olarak okunabilir. Bunu düzeltip
        tam 10 haneli bir string'e indirger. Kural sağlanmazsa None döner.
        """
        if pd.isna(raw_value):
            return None

        # Float olarak gelmiş olabilir (örn. 1234567890.0) -- tam sayıya çevirip
        # ondalık kısmı at.
        if isinstance(raw_value, float):
            raw_value = int(raw_value)

        value_str = str(raw_value).strip()

        if not re.match(r"^\d{10}$", value_str):
            return None

        return value_str

    def post(self, request, *args, **kwargs):
        upload_serializer = WaybillExcelUploadSerializer(data=request.data)
        upload_serializer.is_valid(raise_exception=True)
        excel_file = upload_serializer.validated_data["file"]

        try:
            df = pd.read_excel(excel_file, engine="openpyxl")
        except Exception as e:
            return Response(
                {"detail": f"Excel dosyası okunamadı: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if df.empty:
            return Response(
                {"detail": "Excel dosyası boş."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        missing_columns = self.REQUIRED_COLUMNS - set(df.columns)
        if missing_columns:
            return Response(
                {
                    "detail": "Excel dosyasında eksik sütunlar var.",
                    "missing_columns": list(missing_columns),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Opsiyonel sütunlardan (shipment_date, status, sender, receiver, weight)
        # Excel'de hiç bulunmayanları, tamamen boş (NaN) bir sütun olarak DataFrame'e
        # ekliyoruz. Böylece aşağıdaki satır işleme mantığı (row["shipment_date"] gibi)
        # sütun var/yok farkını hiç bilmeden, "hücre boş" durumuyla aynı şekilde
        # çalışır -- ayrı bir kod yolu yazmamıza gerek kalmıyor.
        for optional_column in self.OPTIONAL_COLUMNS:
            if optional_column not in df.columns:
                df[optional_column] = None

        to_update = []
        to_create = []
        errors = []

        existing_numbers = set(
            Waybill.objects.values_list("waybill_number", flat=True)
        )

        for index, row in df.iterrows():
            excel_row_number = index + 2

            try:
                # --- TEK GERÇEK ZORUNLU ALAN: waybill_number (tam 10 haneli rakam) ---
                waybill_number = self._normalize_waybill_number(row["waybill_number"])
                if waybill_number is None:
                    raise ValueError("waybill_number tam 10 haneli bir rakam olmalıdır.")
                

                # --- shipment_date: boşsa/geçersizse placeholder tarihe düşer ---
                if pd.isna(row["shipment_date"]):
                    shipment_date = PLACEHOLDER_DATE
                else:
                    try:
                        shipment_date = pd.to_datetime(row["shipment_date"]).date()
                    except (ValueError, TypeError):
                        shipment_date = PLACEHOLDER_DATE

                # --- weight: boş/geçersizse None ("VERİ YOK") olarak kaydedilir ---
                weight_raw = row["weight"]
                if pd.isna(weight_raw):
                    weight = None
                else:
                    try:
                        weight = float(weight_raw)
                        if weight <= 0:
                            weight = None
                    except (ValueError, TypeError):
                        weight = None

                # --- status: geçersizse PENDING'e düşer ---
                status_value = str(row.get("status", "PENDING")).strip().upper()
                valid_statuses = [c[0] for c in Waybill.StatusChoices.choices]
                if status_value not in valid_statuses:
                    status_value = Waybill.StatusChoices.PENDING

                # --- sender / receiver: boşsa "-" ---
                sender = self._normalize_optional_field(row["sender"])
                receiver = self._normalize_optional_field(row["receiver"])

                data = {
                    "waybill_number": waybill_number,
                    "shipment_date": shipment_date,
                    "status": status_value,
                    "sender": sender,
                    "receiver": receiver,
                    "weight": weight,
                }

                if waybill_number in existing_numbers:
                    to_update.append(data)
                else:
                    to_create.append(Waybill(**data))
                    existing_numbers.add(waybill_number)

            except (ValueError, KeyError, TypeError) as e:
                errors.append({"row": excel_row_number, "error": str(e)})

        created_count = 0
        updated_count = 0

        try:
            with transaction.atomic():
                if to_create:
                    Waybill.objects.bulk_create(to_create, batch_size=500)
                    created_count = len(to_create)

                for data in to_update:
                    _, created = Waybill.objects.update_or_create(
                        waybill_number=data["waybill_number"],
                        defaults=data,
                    )
                    updated_count += 1

        except Exception as e:
            return Response(
                {"detail": f"Veritabanı işlemi sırasında hata oluştu: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "detail": "Yükleme tamamlandı.",
                "created": created_count,
                "updated": updated_count,
                "error_count": len(errors),
                "errors": errors,
            },
            status=status.HTTP_200_OK,
        )


# --------------------------------------------------------------------------
# 2) LİSTELEME VE FİLTRELEME ENDPOINT'İ
# --------------------------------------------------------------------------

class WaybillListView(generics.ListAPIView):
    """
    GET /api/waybills/?start_date=2026-06-01&end_date=2026-06-30&status=PENDING&page=1

    Tarih aralığına, duruma ve eksik-veri durumuna göre filtreleme + sayfalama
    destekler. Ayrıca filtrelenmiş TÜM sonuç kümesi için özet (toplam kayıt
    sayısı, toplam ağırlık) bilgisi döner.
    """
    serializer_class = WaybillSerializer
    pagination_class = WaybillPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["waybill_number", "sender", "receiver"]
    ordering_fields = ["waybill_number", "shipment_date", "status", "sender", "receiver", "weight"]
    ordering = ["-shipment_date"]

    def get_queryset(self):
        return filter_waybills_queryset(self.request)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        summary = queryset.aggregate(
            total_count=Count("id"),
            total_weight=Sum("weight"),
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["summary"] = {
                "total_count": summary["total_count"] or 0,
                "total_weight": float(summary["total_weight"] or 0),
            }
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# --------------------------------------------------------------------------
# 3) FİLTRELENMİŞ SONUÇLARI EXCEL OLARAK DIŞA AKTARMA
# --------------------------------------------------------------------------

class WaybillExportView(APIView):
    """
    GET /api/waybills/export/?start_date=...&end_date=...&status=...

    WaybillListView ile AYNI filtreleme mantığını (filter_waybills_queryset)
    kullanır, ama sayfalama uygulamadan TÜM sonuçları bir .xlsx dosyası olarak döner.
    """

    def get(self, request, *args, **kwargs):
        queryset = filter_waybills_queryset(request)

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Konşimentolar"

        headers = ["Konşimento No", "Sevkiyat Tarihi", "Durum", "Gönderici", "Alıcı", "Ağırlık (kg)"]
        ws.append(headers)

        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="2C3E50", end_color="2C3E50", fill_type="solid")
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill

        for waybill in queryset.iterator():
            ws.append([
                waybill.waybill_number,
                waybill.shipment_date.strftime("%d.%m.%Y"),
                waybill.get_status_display(),
                waybill.sender,
                waybill.receiver,
                float(waybill.weight) if waybill.weight is not None else "VERİ YOK",
            ])

        column_widths = [18, 15, 15, 28, 28, 12]
        for i, width in enumerate(column_widths, start=1):
            ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = width

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        start_date_param = request.query_params.get("start_date")
        end_date_param = request.query_params.get("end_date")
        filename = f"konsimentolar_{start_date_param or 'tumu'}_{end_date_param or 'tumu'}.xlsx"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        wb.save(response)
        return response


# --------------------------------------------------------------------------
# 4) TEKİL KAYIT: GÖRÜNTÜLEME, GÜNCELLEME, SİLME
# --------------------------------------------------------------------------

class WaybillDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/waybills/<id>/  -> tekil kayıt detayı
    PATCH  /api/waybills/<id>/  -> kısmi güncelleme (sadece değişen alanlar gönderilir)
    PUT    /api/waybills/<id>/  -> tam güncelleme (tüm alanlar gönderilmeli)
    DELETE /api/waybills/<id>/  -> kaydı sil
    """
    queryset = Waybill.objects.all()
    serializer_class = WaybillSerializer