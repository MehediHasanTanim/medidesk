import uuid
from typing import Any, Dict

from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from domain.entities.medicine import BrandMedicine, GenericMedicine
from infrastructure.orm.models.medicine_model import ManufacturerModel
from infrastructure.repositories.django_medicine_repository import DjangoMedicineRepository
from interfaces.api.v1.medicines.serializers import (
    BrandMedicineSerializer,
    CreateBrandMedicineSerializer,
    CreateGenericMedicineSerializer,
    CreateManufacturerSerializer,
    GenericMedicineSerializer,
    ManufacturerSerializer,
    MedicineSearchResponseSerializer,
    PaginatedBrandListSerializer,
    PaginatedGenericListSerializer,
    PaginatedManufacturerListSerializer,
    UpdateBrandMedicineSerializer,
    UpdateGenericMedicineSerializer,
    UpdateManufacturerSerializer,
)
from interfaces.permissions import RolePermission


# ── Manufacturer helpers ──────────────────────────────────────────────────────

def _manufacturer_to_dict(m: ManufacturerModel) -> Dict[str, Any]:
    return {
        "id": str(m.id),
        "name": m.name,
        "country": m.country,
        "is_active": m.is_active,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generic_to_dict(g: GenericMedicine, brand_count: int = 0) -> Dict[str, Any]:
    return {
        "id": str(g.id),
        "generic_name": g.generic_name,
        "drug_class": g.drug_class,
        "contraindications": g.contraindications,
        "brand_count": brand_count,
    }


def _brand_to_dict(b: BrandMedicine) -> Dict[str, Any]:
    return {
        "id": str(b.id),
        "generic_id": str(b.generic_id),
        "brand_name": b.brand_name,
        "manufacturer": b.manufacturer,
        "strength": b.strength,
        "form": b.form,
        "is_active": b.is_active,
    }


# ── Generic medicines ─────────────────────────────────────────────────────────

@extend_schema(tags=["medicines"])
class GenericMedicineListView(APIView):
    """
    GET  /medicines/generics/  — list with optional search/filter
    POST /medicines/generics/  — create a new generic medicine (doctor/admin)
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List generic medicines",
        parameters=[
            OpenApiParameter("search", OpenApiTypes.STR, description="Filter by generic name"),
            OpenApiParameter("drug_class", OpenApiTypes.STR, description="Filter by drug class"),
            OpenApiParameter("limit", OpenApiTypes.INT, description="Page size (default 50)"),
            OpenApiParameter("offset", OpenApiTypes.INT, description="Pagination offset"),
        ],
        responses={200: PaginatedGenericListSerializer},
    )
    def get(self, request: Request) -> Response:
        repo = DjangoMedicineRepository()
        search = request.query_params.get("search", "")
        drug_class = request.query_params.get("drug_class", "")
        limit = min(int(request.query_params.get("limit", 50)), 200)
        offset = int(request.query_params.get("offset", 0))

        generics = repo.list_generics(search=search, drug_class=drug_class, limit=limit, offset=offset)
        total = repo.count_generics(search=search, drug_class=drug_class)

        return Response({
            "count": total,
            "results": [
                _generic_to_dict(g, brand_count=repo.brand_count_for_generic(g.id))
                for g in generics
            ],
        })

    @extend_schema(
        summary="Create generic medicine",
        description="Create a new generic medicine. Accessible to doctors and admins.",
        request=CreateGenericMedicineSerializer,
        responses={201: GenericMedicineSerializer},
    )
    def post(self, request: Request) -> Response:
        self.permission_classes = [IsAuthenticated, RolePermission(["doctor"])]
        self.check_permissions(request)

        serializer = CreateGenericMedicineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        repo = DjangoMedicineRepository()
        # Check uniqueness
        existing = repo.list_generics(search=data["generic_name"])
        for g in existing:
            if g.generic_name.lower() == data["generic_name"].lower():
                return Response(
                    {"error": f"Generic medicine '{data['generic_name']}' already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        generic = GenericMedicine(
            id=uuid.uuid4(),
            generic_name=data["generic_name"].strip(),
            drug_class=data["drug_class"].strip(),
            contraindications=data.get("contraindications", []),
        )
        saved = repo.create_generic(generic)
        return Response(_generic_to_dict(saved, brand_count=0), status=status.HTTP_201_CREATED)


@extend_schema(tags=["medicines"])
class GenericMedicineDetailView(APIView):
    """
    GET    /medicines/generics/<id>/  — get generic detail with brand list
    PATCH  /medicines/generics/<id>/  — update generic (doctor/admin)
    DELETE /medicines/generics/<id>/  — delete generic if no brands (admin only)
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get generic medicine",
        responses={200: GenericMedicineSerializer},
    )
    def get(self, request: Request, generic_id: uuid.UUID) -> Response:
        repo = DjangoMedicineRepository()
        generic = repo.get_generic_by_id(generic_id)
        if not generic:
            return Response({"error": "Generic medicine not found"}, status=status.HTTP_404_NOT_FOUND)
        brand_count = repo.brand_count_for_generic(generic_id)
        return Response(_generic_to_dict(generic, brand_count=brand_count))

    @extend_schema(
        summary="Update generic medicine",
        request=UpdateGenericMedicineSerializer,
        responses={200: GenericMedicineSerializer},
    )
    def patch(self, request: Request, generic_id: uuid.UUID) -> Response:
        self.permission_classes = [IsAuthenticated, RolePermission(["doctor"])]
        self.check_permissions(request)

        repo = DjangoMedicineRepository()
        generic = repo.get_generic_by_id(generic_id)
        if not generic:
            return Response({"error": "Generic medicine not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateGenericMedicineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "generic_name" in data:
            generic.generic_name = data["generic_name"].strip()
        if "drug_class" in data:
            generic.drug_class = data["drug_class"].strip()
        if "contraindications" in data:
            generic.contraindications = data["contraindications"]

        saved = repo.update_generic(generic)
        brand_count = repo.brand_count_for_generic(generic_id)
        return Response(_generic_to_dict(saved, brand_count=brand_count))

    @extend_schema(
        summary="Delete generic medicine",
        description="Permanently delete a generic medicine. Only allowed if it has no associated brands.",
        request=None,
        responses={204: None},
    )
    def delete(self, request: Request, generic_id: uuid.UUID) -> Response:
        self.permission_classes = [IsAuthenticated, RolePermission([])]  # admin only (RolePermission with empty list still passes admin)
        self.check_permissions(request)

        repo = DjangoMedicineRepository()
        generic = repo.get_generic_by_id(generic_id)
        if not generic:
            return Response({"error": "Generic medicine not found"}, status=status.HTTP_404_NOT_FOUND)

        brand_count = repo.brand_count_for_generic(generic_id)
        if brand_count > 0:
            return Response(
                {"error": f"Cannot delete: {brand_count} brand(s) reference this generic. Deactivate brands first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        repo.delete_generic(generic_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Brand medicines ───────────────────────────────────────────────────────────

@extend_schema(tags=["medicines"])
class BrandMedicineListView(APIView):
    """
    GET  /medicines/brands/  — list brands with optional filters
    POST /medicines/brands/  — add a brand (doctor/admin)
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List brand medicines",
        parameters=[
            OpenApiParameter("search", OpenApiTypes.STR, description="Filter by brand or generic name"),
            OpenApiParameter("generic_id", OpenApiTypes.UUID, description="Filter by generic medicine"),
            OpenApiParameter("form", OpenApiTypes.STR, description="Filter by form (tablet, capsule, …)"),
            OpenApiParameter("active_only", OpenApiTypes.BOOL, description="Include inactive brands (default true)"),
            OpenApiParameter("limit", OpenApiTypes.INT),
            OpenApiParameter("offset", OpenApiTypes.INT),
        ],
        responses={200: PaginatedBrandListSerializer},
    )
    def get(self, request: Request) -> Response:
        repo = DjangoMedicineRepository()
        search = request.query_params.get("search", "")
        generic_id_str = request.query_params.get("generic_id", "")
        form = request.query_params.get("form", "")
        active_only = request.query_params.get("active_only", "true").lower() != "false"
        limit = min(int(request.query_params.get("limit", 50)), 200)
        offset = int(request.query_params.get("offset", 0))

        generic_id = uuid.UUID(generic_id_str) if generic_id_str else None

        brands = repo.list_brands(
            search=search, generic_id=generic_id, form=form,
            active_only=active_only, limit=limit, offset=offset,
        )
        total = repo.count_brands(
            search=search, generic_id=generic_id, form=form, active_only=active_only
        )

        return Response({
            "count": total,
            "results": [_brand_to_dict(b) for b in brands],
        })

    @extend_schema(
        summary="Add brand medicine",
        description="Add a new brand medicine linked to a generic. Accessible to doctors and admins.",
        request=CreateBrandMedicineSerializer,
        responses={201: BrandMedicineSerializer},
    )
    def post(self, request: Request) -> Response:
        self.permission_classes = [IsAuthenticated, RolePermission(["doctor"])]
        self.check_permissions(request)

        serializer = CreateBrandMedicineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        repo = DjangoMedicineRepository()
        # Verify generic exists
        generic = repo.get_generic_by_id(data["generic_id"])
        if not generic:
            return Response({"error": "Generic medicine not found"}, status=status.HTTP_400_BAD_REQUEST)

        brand = BrandMedicine(
            id=uuid.uuid4(),
            generic_id=data["generic_id"],
            brand_name=data["brand_name"].strip(),
            manufacturer=data["manufacturer"].strip(),
            strength=data["strength"].strip(),
            form=data["form"],
            is_active=data.get("is_active", True),
        )
        saved = repo.create_brand(brand)
        return Response(_brand_to_dict(saved), status=status.HTTP_201_CREATED)


@extend_schema(tags=["medicines"])
class BrandMedicineDetailView(APIView):
    """
    GET    /medicines/brands/<id>/  — get brand detail
    PATCH  /medicines/brands/<id>/  — update brand (doctor/admin)
    DELETE /medicines/brands/<id>/  — deactivate brand (admin only)
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get brand medicine",
        responses={200: BrandMedicineSerializer},
    )
    def get(self, request: Request, brand_id: uuid.UUID) -> Response:
        repo = DjangoMedicineRepository()
        brand = repo.get_brand_by_id(brand_id)
        if not brand:
            return Response({"error": "Brand medicine not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_brand_to_dict(brand))

    @extend_schema(
        summary="Update brand medicine",
        request=UpdateBrandMedicineSerializer,
        responses={200: BrandMedicineSerializer},
    )
    def patch(self, request: Request, brand_id: uuid.UUID) -> Response:
        self.permission_classes = [IsAuthenticated, RolePermission(["doctor"])]
        self.check_permissions(request)

        repo = DjangoMedicineRepository()
        brand = repo.get_brand_by_id(brand_id)
        if not brand:
            return Response({"error": "Brand medicine not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateBrandMedicineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "brand_name" in data:
            brand.brand_name = data["brand_name"].strip()
        if "manufacturer" in data:
            brand.manufacturer = data["manufacturer"].strip()
        if "strength" in data:
            brand.strength = data["strength"].strip()
        if "form" in data:
            brand.form = data["form"]
        if "is_active" in data:
            brand.is_active = data["is_active"]

        saved = repo.update_brand(brand)
        return Response(_brand_to_dict(saved))

    @extend_schema(
        summary="Deactivate brand medicine",
        description="Soft-delete: sets is_active=False. The brand remains in the database for historical prescription data.",
        request=None,
        responses={200: BrandMedicineSerializer},
    )
    def delete(self, request: Request, brand_id: uuid.UUID) -> Response:
        self.permission_classes = [IsAuthenticated, RolePermission([])]  # admin only
        self.check_permissions(request)

        repo = DjangoMedicineRepository()
        brand = repo.get_brand_by_id(brand_id)
        if not brand:
            return Response({"error": "Brand medicine not found"}, status=status.HTTP_404_NOT_FOUND)

        repo.deactivate_brand(brand_id)
        brand.is_active = False
        return Response(_brand_to_dict(brand))


# ── Search (existing, enhanced) ───────────────────────────────────────────────

@extend_schema(tags=["medicines"])
class MedicineSearchView(APIView):
    """
    GET /medicines/search/?q=  — typeahead search for prescription autocomplete
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Search medicines (autocomplete)",
        description="Typeahead search across brand name and generic name. Used by the prescription form.",
        parameters=[
            OpenApiParameter("q", OpenApiTypes.STR, required=True, description="Search query (min 2 chars)"),
            OpenApiParameter("limit", OpenApiTypes.INT, description="Max results (default 10, max 20)"),
        ],
        responses={200: MedicineSearchResponseSerializer},
    )
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


# ── Manufacturer CRUD ─────────────────────────────────────────────────────────

@extend_schema(tags=["medicines"])
class ManufacturerListView(APIView):
    """
    GET  /medicines/manufacturers/  — list manufacturers (active by default)
    POST /medicines/manufacturers/  — create manufacturer (doctor/admin)
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List manufacturers",
        parameters=[
            OpenApiParameter("search", OpenApiTypes.STR, description="Filter by name"),
            OpenApiParameter("active_only", OpenApiTypes.BOOL, description="Include inactive (default true)"),
            OpenApiParameter("limit", OpenApiTypes.INT),
            OpenApiParameter("offset", OpenApiTypes.INT),
        ],
        responses={200: PaginatedManufacturerListSerializer},
    )
    def get(self, request: Request) -> Response:
        search = request.query_params.get("search", "")
        active_only = request.query_params.get("active_only", "true").lower() != "false"
        limit = min(int(request.query_params.get("limit", 200)), 500)
        offset = int(request.query_params.get("offset", 0))

        qs = ManufacturerModel.objects.all()
        if active_only:
            qs = qs.filter(is_active=True)
        if search:
            qs = qs.filter(name__icontains=search)
        total = qs.count()
        results = list(qs[offset:offset + limit])
        return Response({
            "count": total,
            "results": [_manufacturer_to_dict(m) for m in results],
        })

    @extend_schema(
        summary="Create manufacturer",
        request=CreateManufacturerSerializer,
        responses={201: ManufacturerSerializer},
    )
    def post(self, request: Request) -> Response:
        self.permission_classes = [IsAuthenticated, RolePermission(["doctor"])]
        self.check_permissions(request)

        serializer = CreateManufacturerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if ManufacturerModel.objects.filter(name__iexact=data["name"]).exists():
            return Response(
                {"error": f"Manufacturer '{data['name']}' already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        m = ManufacturerModel.objects.create(
            name=data["name"].strip(),
            country=data.get("country", "Bangladesh").strip(),
        )
        return Response(_manufacturer_to_dict(m), status=status.HTTP_201_CREATED)


@extend_schema(tags=["medicines"])
class ManufacturerDetailView(APIView):
    """
    GET    /medicines/manufacturers/<id>/  — detail
    PATCH  /medicines/manufacturers/<id>/  — update (doctor/admin)
    DELETE /medicines/manufacturers/<id>/  — deactivate (admin only)
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get manufacturer", responses={200: ManufacturerSerializer})
    def get(self, request: Request, manufacturer_id: uuid.UUID) -> Response:
        try:
            m = ManufacturerModel.objects.get(id=manufacturer_id)
        except ManufacturerModel.DoesNotExist:
            return Response({"error": "Manufacturer not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_manufacturer_to_dict(m))

    @extend_schema(
        summary="Update manufacturer",
        request=UpdateManufacturerSerializer,
        responses={200: ManufacturerSerializer},
    )
    def patch(self, request: Request, manufacturer_id: uuid.UUID) -> Response:
        self.permission_classes = [IsAuthenticated, RolePermission(["doctor"])]
        self.check_permissions(request)

        try:
            m = ManufacturerModel.objects.get(id=manufacturer_id)
        except ManufacturerModel.DoesNotExist:
            return Response({"error": "Manufacturer not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateManufacturerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "name" in data:
            new_name = data["name"].strip()
            if ManufacturerModel.objects.filter(name__iexact=new_name).exclude(id=manufacturer_id).exists():
                return Response({"error": f"Manufacturer '{new_name}' already exists."}, status=status.HTTP_400_BAD_REQUEST)
            m.name = new_name
        if "country" in data:
            m.country = data["country"].strip()
        if "is_active" in data:
            m.is_active = data["is_active"]
        m.save()
        return Response(_manufacturer_to_dict(m))

    @extend_schema(
        summary="Deactivate manufacturer",
        description="Soft-delete: sets is_active=False. Existing brand records are unaffected.",
        request=None,
        responses={200: ManufacturerSerializer},
    )
    def delete(self, request: Request, manufacturer_id: uuid.UUID) -> Response:
        self.permission_classes = [IsAuthenticated, RolePermission([])]  # admin only
        self.check_permissions(request)

        try:
            m = ManufacturerModel.objects.get(id=manufacturer_id)
        except ManufacturerModel.DoesNotExist:
            return Response({"error": "Manufacturer not found"}, status=status.HTTP_404_NOT_FOUND)

        m.is_active = False
        m.save()
        return Response(_manufacturer_to_dict(m))
