from django.contrib import admin
from .models import Waybill

@admin.register(Waybill)
class WaybillAdmin(admin.ModelAdmin):
    list_display = ("waybill_number", "shipment_date", "status", "sender", "receiver", "weight")
    list_filter = ("status", "shipment_date")
    search_fields = ("waybill_number", "sender", "receiver")
