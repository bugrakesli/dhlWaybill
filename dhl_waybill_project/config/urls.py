from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("waybills.urls")),  # Adım 2'deki endpoint'ler /api/waybills/ altında olacak
    # DEBUG=False iken (paketlenmiş .exe) runserver statik dosyaları otomatik
    # servis etmiyor -- bu satır olmadan /static/... istekleri de aşağıdaki
    # catch-all'a düşüp index.html döndürüyordu (frontend hiç yüklenmiyordu).
    re_path(
        r"^static/(?P<path>.*)$",
        serve,
        {"document_root": settings.FRONTEND_DIR},
    ),
    re_path(r"^.*$", TemplateView.as_view(template_name="index.html")),
]