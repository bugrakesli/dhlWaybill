import re
from rest_framework import serializers
from .models import Waybill


class WaybillSerializer(serializers.ModelSerializer):
    """
    Standart CRUD ve listeleme işlemleri için kullanılan serializer.
    """

    payment_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    is_incomplete = serializers.BooleanField(read_only=True)

    class Meta:
        model = Waybill
        fields = [
            "id",
            "waybill_number",
            "shipment_date",
            "sender",
            "destination",
            "piece_count",
            "collected_by",
            "delivered",
            "receiver",
            "euro_amount",
            "exchange_rate",
            "payment_amount",
            "is_incomplete",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "payment_amount", "is_incomplete", "created_at", "updated_at"]

    def validate_waybill_number(self, value):
        value = str(value).strip()
        if not value:
            raise serializers.ValidationError("Konşimento (AWB) numarası boş olamaz.")
        return value

    def validate_piece_count(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Parça sayısı 0 veya daha büyük olmalıdır.")
        return value

    def validate_euro_amount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Euro tutarı 0 veya daha büyük olmalıdır.")
        return value

    def validate_exchange_rate(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Kur 0 veya daha büyük olmalıdır.")
        return value


class WaybillExcelUploadSerializer(serializers.Serializer):
    """
    Excel upload endpoint'i için dosya doğrulama serializer'ı.
    Model'e bağlı değil, sadece gelen dosyanın tipini/boyutunu kontrol eder.
    """

    file = serializers.FileField()

    ALLOWED_EXTENSIONS = (".xlsx", ".xls", ".csv")

    def validate_file(self, value):
        if not value.name.lower().endswith(self.ALLOWED_EXTENSIONS):
            raise serializers.ValidationError(
                "Yalnızca .xlsx, .xls veya .csv dosyaları kabul edilir."
            )

        max_size_mb = 100
        if value.size > max_size_mb * 1024 * 1024:
            raise serializers.ValidationError(
                f"Dosya boyutu {max_size_mb}MB'ı aşamaz."
            )

        return value