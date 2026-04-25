import uuid

from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.user_dto import CreateChamberDTO, UpdateChamberDTO
from application.use_cases.chamber.manage_chamber import CreateChamberUseCase, UpdateChamberUseCase
from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
from interfaces.api.v1.chambers.serializers import CreateChamberSerializer, UpdateChamberSerializer
from interfaces.api.v1.mixins import AuditMixin
from interfaces.permissions import AdminOnly


class ChamberListView(AuditMixin, APIView):
    """GET  /chambers/ — list chambers (all authenticated users)
       POST /chambers/ — create chamber (admin only)"""
    audit_resource_type = "chamber"

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), AdminOnly()]
        return [IsAuthenticated()]

    @extend_schema(
        tags=["chambers"],
        summary="List chambers",
        description="Returns all chambers. Pass `active_only=false` to include inactive ones.",
    )
    def get(self, request: Request) -> Response:
        active_only = request.query_params.get("active_only", "true") != "false"
        with DjangoUnitOfWork() as uow:
            chambers = uow.chambers.list_all(active_only=active_only)
        return Response([
            {
                "id": str(c.id),
                "name": c.name,
                "address": c.address,
                "phone": c.phone,
                "latitude": c.latitude,
                "longitude": c.longitude,
                "is_active": c.is_active,
            }
            for c in chambers
        ])

    @extend_schema(
        tags=["chambers"],
        summary="Create chamber",
        description="Creates a new clinic chamber/branch. Admin only.",
        request=CreateChamberSerializer,
        responses={
            201: OpenApiResponse(description="Chamber created"),
            400: OpenApiResponse(description="Validation error"),
        },
    )
    def post(self, request: Request) -> Response:
        serializer = CreateChamberSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        dto = CreateChamberDTO(
            name=data["name"],
            address=data["address"],
            phone=data["phone"],
            latitude=float(data["latitude"]) if data.get("latitude") is not None else None,
            longitude=float(data["longitude"]) if data.get("longitude") is not None else None,
        )
        try:
            result = CreateChamberUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class ChamberDetailView(AuditMixin, APIView):
    """GET   /chambers/<id>/ — get chamber
       PATCH /chambers/<id>/ — update chamber (admin only)"""
    audit_resource_type = "chamber"

    def get_permissions(self):
        if self.request.method in ("PATCH", "DELETE"):
            return [IsAuthenticated(), AdminOnly()]
        return [IsAuthenticated()]

    @extend_schema(tags=["chambers"], summary="Get chamber by ID")
    def get(self, request: Request, chamber_id: uuid.UUID) -> Response:
        with DjangoUnitOfWork() as uow:
            chamber = uow.chambers.get_by_id(chamber_id)
        if not chamber:
            return Response({"error": "Chamber not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "id": str(chamber.id),
            "name": chamber.name,
            "address": chamber.address,
            "phone": chamber.phone,
            "latitude": chamber.latitude,
            "longitude": chamber.longitude,
            "is_active": chamber.is_active,
        })

    @extend_schema(
        tags=["chambers"],
        summary="Delete chamber",
        description="Permanently deletes a chamber. Existing appointments will have their chamber set to null. Admin only.",
        responses={
            204: OpenApiResponse(description="Deleted"),
            404: OpenApiResponse(description="Chamber not found"),
        },
    )
    def delete(self, request: Request, chamber_id: uuid.UUID) -> Response:
        with DjangoUnitOfWork() as uow:
            chamber = uow.chambers.get_by_id(chamber_id)
            if not chamber:
                return Response({"error": "Chamber not found"}, status=status.HTTP_404_NOT_FOUND)
            uow.chambers.delete(chamber_id)
            uow.commit()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        tags=["chambers"],
        summary="Update chamber",
        description="Update name, address, phone, or is_active. All fields optional. Admin only.",
        request=UpdateChamberSerializer,
        responses={
            200: OpenApiResponse(description="Chamber updated"),
            400: OpenApiResponse(description="Validation error"),
            404: OpenApiResponse(description="Chamber not found"),
        },
    )
    def patch(self, request: Request, chamber_id: uuid.UUID) -> Response:
        serializer = UpdateChamberSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        dto = UpdateChamberDTO(chamber_id=str(chamber_id), **serializer.validated_data)
        try:
            result = UpdateChamberUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_404_NOT_FOUND)
