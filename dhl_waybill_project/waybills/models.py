from datetime import date
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

    weight = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Ağırlık (kg)",
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

    payment_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Ödenen Tutar (TL)",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.payment_amount is None and self.euro_amount is not None and self.exchange_rate is not None:
            self.payment_amount = round(self.euro_amount * self.exchange_rate, 2)
        super().save(*args, **kwargs)

    @property
    def is_incomplete(self):
        """
        Herhangi bir zorunlu alan eksik mi (tarih 1900-01-01, placeholder metinler '-', veya boş/None alanlar).
        """
        PLACEHOLDER_DATE = date(1900, 1, 1)
        PLACEHOLDER_TEXT = "-"
        return (
            self.shipment_date == PLACEHOLDER_DATE
            or self.sender == PLACEHOLDER_TEXT
            or self.receiver == PLACEHOLDER_TEXT
            or self.destination == PLACEHOLDER_TEXT
            or self.collected_by == PLACEHOLDER_TEXT
            or self.euro_amount is None
            or self.exchange_rate is None
            or self.piece_count is None
        )

    class Meta:
        ordering = ["-shipment_date", "-id"]
        indexes = [
            models.Index(fields=["shipment_date", "delivered"]),
        ]
        verbose_name = "Konşimento"
        verbose_name_plural = "Konşimentolar"

    def __str__(self):
        return f"{self.waybill_number} ({self.shipment_date})"


class ExchangeRateCache(models.Model):
    """
    TCMB veya yedek servislerden çekilen döviz kurlarını saklayan önbellek modeli.
    Tekrar eden tarih sorgularının anında veritabanından dönmesini sağlar.
    """
    rate_date = models.DateField(
        db_index=True,
        verbose_name="Kur Tarihi",
    )
    actual_bulletin_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Bülten Tarihi",
    )
    currency = models.CharField(
        max_length=10,
        default="EUR",
        verbose_name="Para Birimi",
    )
    rate = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        verbose_name="Döviz Satış Kuru",
    )
    source = models.CharField(
        max_length=50,
        default="TCMB",
        verbose_name="Kaynak",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["rate_date", "currency"]
        verbose_name = "Kur Önbelleği"
        verbose_name_plural = "Kur Önbellekleri"

    def __str__(self):
        return f"{self.currency} / TRY - {self.rate_date}: {self.rate} ({self.source})"