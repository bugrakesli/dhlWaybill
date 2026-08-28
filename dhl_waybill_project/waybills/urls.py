from django.urls import path
from .views import (
    WaybillExcelUploadView,
    WaybillListView,
    WaybillExportView,
    WaybillDetailView,
    WaybillBulkDeleteView,
    WaybillClearAllView,
    ExchangeRateView,
    WaybillTerritoryListView,
)

urlpatterns = [
    path("waybills/", WaybillListView.as_view(), name="waybill-list"),
    path("waybills/upload/", WaybillExcelUploadView.as_view(), name="waybill-upload"),
    path("waybills/export/", WaybillExportView.as_view(), name="waybill-export"),
    path("waybills/bulk-delete/", WaybillBulkDeleteView.as_view(), name="waybill-bulk-delete"),
    path("waybills/clear-all/", WaybillClearAllView.as_view(), name="waybill-clear-all"),
    path("waybills/exchange-rate/", ExchangeRateView.as_view(), name="waybill-exchange-rate"),
    path("waybills/territories/", WaybillTerritoryListView.as_view(), name="waybill-territories"),
    path("waybills/<int:pk>/", WaybillDetailView.as_view(), name="waybill-detail"),
]
