from django.db import models
from django.core.validators import MinValueValidator


class Waybill(models.Model):
    """
    Konşimento (Waybill / AWB) kayıtlarını temsil eden model.
    Excel'den toplu yükleme ile veya API üzerinden tekil olarak oluşturulabilir.
    """

    waybill_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name="AWB / Konşimento No",
    )

    shipment_date = models.DateField(
        db_index=True,
        verbose_name="Tarih",
    )

    sender = models.CharField(
        max_length=255,
        default="-",
        verbose_name="Gönderici Firma/Şahıs",
    )

    destination = models.CharField(
        max_length=255,
        default="-",
        verbose_name="Ülke - Varış Noktası",
    )

    piece_count = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Parça",
    )

    collected_by = models.CharField(
        max_length=255,
        default="-",
        verbose_name="Toplayan",
    )

    delivered = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Teslim Edildi",
    )

    receiver = models.CharField(
        max_length=255,
        default="-",
        verbose_name="Alıcı Firma/Şahıs",
    )

    euro_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Euro",
    )

    exchange_rate = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Kur",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def payment_amount(self):
        """
        Hesaplanan TL Tutar: Euro * Kur
        """
        if self.euro_amount is not None and self.exchange_rate is not None:
            return round(float(self.euro_amount * self.exchange_rate), 2)
        return None

    class Meta:
        ordering = ["-shipment_date", "-id"]
        indexes = [
            models.Index(fields=["shipment_date", "delivered"]),
        ]
        verbose_name = "Konşimento"
        verbose_name_plural = "Konşimentolar"

    def __str__(self):
        return f"{self.waybill_number} ({self.shipment_date})"