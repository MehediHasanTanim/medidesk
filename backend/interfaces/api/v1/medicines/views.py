from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from infrastructure.repositories.django_medicine_repository import DjangoMedicineRepository


@extend_schema(tags=["medicines"])
class MedicineSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        query = request.query_params.get("q", "")
        limit = min(int(request.query_params.get("limit", 10)), 20)
        if not query:
            return Response({"results": []})

        repo = DjangoMedicineRepository()
        medicines = repo.search_brands(query, limit=limit)
        return Response({
            "results": [
                {
                    "id": str(m.id),
                    "brand_name": m.brand_name,
                    "strength": m.strength,
                    "form": m.form,
                    "manufacturer": m.manufacturer,
                    "generic_id": str(m.generic_id),
                }
                for m in medicines
            ]
        })
