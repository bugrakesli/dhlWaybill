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
        self.assertEqual(waybill.payment_amount, 5342.75)

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
            collected_by="Kurye",
            delivered=True,
            receiver="Alici",
            euro_amount=Decimal("100.00"),
            exchange_rate=Decimal("35.0000"),
        )
        self.assertFalse(complete_wb.is_incomplete)

        incomplete_wb = Waybill.objects.create(
            waybill_number="AWB101",
            shipment_date=date(1900, 1, 1),
            sender="-",
            destination="-",
            piece_count=None,
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
        summary = response.data["summary"]
        self.assertEqual(summary["total_count"], 3)
        self.assertEqual(summary["total_pieces"], 7)
        self.assertEqual(summary["total_euro"], 300.0)
        self.assertEqual(summary["delivered_count"], 1)

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

    def test_export_view(self):
        response = self.client.get("/api/waybills/export/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
