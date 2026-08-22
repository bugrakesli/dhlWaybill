import re
from rest_framework import serializers
from .models import Waybill



class WaybillSerializer(serializers.ModelSerializer):
    """
    Standart CRUD ve listeleme işlemleri için kullanılan serializer.
    """

    class Meta:
        model = Waybill
        fields = [
            "id",
            "waybill_number",
            "shipment_date",
            "status",
            "sender",
            "receiver",
            "weight",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_weight(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Ağırlık girilmişse 0'dan büyük olmalıdır.")
        return value

    def validate_waybill_number(self, value):
        value = value.strip()
        if not re.match(r"^\d{10}$", value):
            raise serializers.ValidationError(
            "Konşimento numarası tam 10 haneli rakamlardan oluşmalıdır."
        )
        return value


class WaybillExcelUploadSerializer(serializers.Serializer):
    """
    Excel upload endpoint'i için dosya doğrulama serializer'ı.
    Model'e bağlı değil, sadece gelen dosyanın tipini/boyutunu kontrol eder.
    """

    file = serializers.FileField()

    def validate_file(self, value):
        # Uzantı kontrolü
        if not value.name.endswith(".xlsx"):
            raise serializers.ValidationError("Yalnızca .xlsx dosyaları kabul edilir.")

        # Dosya boyutu kontrolü (örnek: max 10 MB)
        max_size_mb = 10
        if value.size > max_size_mb * 1024 * 1024:
            raise serializers.ValidationError(
                f"Dosya boyutu {max_size_mb}MB'ı aşamaz."
            )

        return value