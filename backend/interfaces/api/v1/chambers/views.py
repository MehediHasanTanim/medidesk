import uuid

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.user_dto import CreateChamberDTO, UpdateChamberDTO
from application.use_cases.chamber.manage_chamber import CreateChamberUseCase, UpdateChamberUseCase
from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
from interfaces.api.v1.chambers.serializers import CreateChamberSerializer, UpdateChamberSerializer
from interfaces.permissions import AdminOnly


@extend_schema(tags=["chambers"])
class ChamberListView(APIView):
    """GET  /chambers/ — list chambers (all authenticated users)
       POST /chambers/ — create chamber (admin only)"""

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), AdminOnly()]
        return [IsAuthenticated()]



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
                "is_active": c.is_active,
            }
            for c in chambers
        ])

    def post(self, request: Request) -> Response:
        serializer = CreateChamberSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        dto = CreateChamberDTO(
            name=data["name"],
            address=data["address"],
            phone=data["phone"],
        )
        try:
            result = CreateChamberUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["chambers"])
class ChamberDetailView(APIView):
    """GET   /chambers/<id>/ — get chamber
       PATCH /chambers/<id>/ — update chamber (admin only)"""

    def get_permissions(self):
        if self.request.method in ("PATCH", "DELETE"):
            return [IsAuthenticated(), AdminOnly()]
        return [IsAuthenticated()]

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
            "is_active": chamber.is_active,
        })

    def patch(self, request: Request, chamber_id: uuid.UUID) -> Response:
        serializer = UpdateChamberSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        dto = UpdateChamberDTO(chamber_id=str(chamber_id), **serializer.validated_data)
        try:
            result = UpdateChamberUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_404_NOT_FOUND)
