import math
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class WaybillPagination(PageNumberPagination):
    """
    Standart sayfalama sınıfı.
    Frontend'in ?page=2&page_size=50 gibi parametrelerle çalışmasını sağlar.
    """
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        total_count = self.page.paginator.count
        page_size = self.get_page_size(self.request) or self.page_size
        total_pages = math.ceil(total_count / page_size) if page_size else 1
        current_page = self.page.number

        return Response({
            "count": total_count,
            "total_pages": total_pages,
            "current_page": current_page,
            "page_size": page_size,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data,
        })