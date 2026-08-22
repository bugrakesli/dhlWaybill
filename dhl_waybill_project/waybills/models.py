from django.db import models
from django.core.validators import MinValueValidator, RegexValidator


class Waybill(models.Model):
    """
    Konşimento (Waybill) kayıtlarını temsil eden model.
    Excel'den toplu yükleme ile veya API üzerinden tekil olarak oluşturulabilir.
    """

    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", "Beklemede"
        IN_TRANSIT = "IN_TRANSIT", "Yolda"
        DELIVERED = "DELIVERED", "Teslim Edildi"
        CANCELLED = "CANCELLED", "İptal Edildi"

    waybill_number = models.CharField(
        max_length=10,
        unique=True,
        db_index=True,
        validators=[
            RegexValidator(
                regex=r"^\d{10}$",
                message="Konşimento numarası tam 10 haneli rakamlardan oluşmalıdır.",
            )
        ],
        verbose_name="Konşimento No",
    )

    # Filtreleme bu alan üzerinden yapılacağı için index kritik önemde.
    # Tarih aralığı sorguları (start_date/end_date) bu index sayesinde
    # tablo tam taraması (full table scan) yerine index seek kullanır.
    shipment_date = models.DateField(
        db_index=True,
        verbose_name="Sevkiyat Tarihi",
    )

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
        verbose_name="Durum",
    )

    sender = models.CharField(max_length=255, verbose_name="Gönderici")
    receiver = models.CharField(max_length=255, verbose_name="Alıcı")

    weight = models.DecimalField(
    max_digits=10,
    decimal_places=2,
    null=True,       # YENİ: veri yoksa NULL olarak saklanabilsin
    blank=True,      # YENİ: admin panelinde/serializer'da boş bırakılabilsin
    validators=[MinValueValidator(0)],
    verbose_name="Ağırlık (kg)",
)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-shipment_date"]  # Varsayılan sıralama: en yeni sevkiyat üstte
        indexes = [
            # shipment_date + status birlikte filtrelenirse (ör. "geçen ay teslim edilenler")
            # composite index performansı daha da artırır.
            models.Index(fields=["shipment_date", "status"]),
        ]
        verbose_name = "Konşimento"
        verbose_name_plural = "Konşimentolar"

    def __str__(self):
        return f"{self.waybill_number} ({self.shipment_date})"