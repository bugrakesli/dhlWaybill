from rest_framework.pagination import PageNumberPagination


class WaybillPagination(PageNumberPagination):
    """
    Standart sayfalama sınıfı.
    Frontend'in ?page=2&page_size=50 gibi parametrelerle çalışmasını sağlar.
    """
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100  # Kullanıcının page_size ile aşırı büyük istek atmasını engelle