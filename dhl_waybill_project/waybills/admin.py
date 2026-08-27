from django.contrib import admin
from .models import Waybill

@admin.register(Waybill)
class WaybillAdmin(admin.ModelAdmin):
    list_display = (
        "waybill_number",
        "shipment_date",
        "sender",
        "receiver",
        "destination",
        "piece_count",
        "weight",
        "collected_by",
        "delivered",
        "euro_amount",
        "exchange_rate",
        "payment_amount",
    )
    list_filter = ("delivered", "shipment_date")
    search_fields = ("waybill_number", "sender", "receiver", "destination", "collected_by")

