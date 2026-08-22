from django.urls import path
from .views import WaybillExcelUploadView, WaybillListView, WaybillExportView, WaybillDetailView

urlpatterns = [
    path("waybills/", WaybillListView.as_view(), name="waybill-list"),
    path("waybills/upload/", WaybillExcelUploadView.as_view(), name="waybill-upload"),
    path("waybills/export/", WaybillExportView.as_view(), name="waybill-export"),
    path("waybills/<int:pk>/", WaybillDetailView.as_view(), name="waybill-detail"),
]
