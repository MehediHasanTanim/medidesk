import uuid

from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.user_dto import CreateUserDTO, UpdateUserDTO
from application.use_cases.user.create_user import CreateUserUseCase
from application.use_cases.user.deactivate_user import DeactivateUserUseCase
from application.use_cases.user.update_user import UpdateUserUseCase
from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
from interfaces.api.v1.users.serializers import CreateUserSerializer, UpdateUserSerializer
from interfaces.permissions import AdminOnly


@extend_schema(
    tags=["users"],
    summary="List doctors",
    description="Returns active doctors and assistant doctors. Accessible to all authenticated users (used for appointment booking dropdowns).",
)
class DoctorsListView(APIView):
    """GET /users/doctors/ — list active doctors & assistant doctors (all authenticated)"""
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        from domain.entities.user import UserRole
        from infrastructure.repositories.django_user_repository import DjangoUserRepository
        repo = DjangoUserRepository()
        doctors = repo.list_by_role(UserRole.DOCTOR) + repo.list_by_role(UserRole.ASSISTANT_DOCTOR)
        doctors.sort(key=lambda u: u.full_name)
        return Response([
            {
                "id": str(u.id),
                "full_name": u.full_name,
                "role": u.role.value,
            }
            for u in doctors
        ])


class UserListView(APIView):
    """GET  /users/  — list all users (admin only)
       POST /users/  — create a new user (admin only)"""
    permission_classes = [IsAuthenticated, AdminOnly]

    @extend_schema(
        tags=["users"],
        summary="List all staff users",
        description="Returns paginated users, filterable by is_active and searchable by name/username/email. Admin only.",
    )
    def get(self, request: Request) -> Response:
        is_active = request.query_params.get("is_active")
        filter_active = None
        if is_active == "true":
            filter_active = True
        elif is_active == "false":
            filter_active = False

        search = request.query_params.get("search", "").strip() or None
        ordering = request.query_params.get("ordering", "").strip() or None

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(100, max(1, int(request.query_params.get("page_size", 20))))
        except ValueError:
            page, page_size = 1, 20

        with DjangoUnitOfWork() as uow:
            total, users = uow.users.list_all(
                is_active=filter_active,
                search=search,
                page=page,
                page_size=page_size,
                ordering=ordering,
            )

        import math
        return Response({
            "count": total,
            "total_pages": math.ceil(total / page_size) if page_size else 1,
            "page": page,
            "page_size": page_size,
            "results": [
                {
                    "id": str(u.id),
                    "username": u.username,
                    "full_name": u.full_name,
                    "email": u.email,
                    "role": u.role.value,
                    "chamber_ids": [str(c) for c in u.chamber_ids],
                    "is_active": u.is_active,
                    "supervisor_doctor_id": str(u.supervisor_id) if u.supervisor_id else None,
                }
                for u in users
            ],
        })

    @extend_schema(
        tags=["users"],
        summary="Create a new staff user",
        description="Creates a new user with the given role and optionally assigns chambers. Admin only.",
        request=CreateUserSerializer,
        responses={201: CreateUserSerializer, 400: OpenApiResponse(description="Validation error or duplicate username")},
    )
    def post(self, request: Request) -> Response:
        serializer = CreateUserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        dto = CreateUserDTO(
            username=data["username"],
            full_name=data["full_name"],
            email=data["email"],
            role=data["role"],
            password=data["password"],
            chamber_ids=[str(c) for c in data.get("chamber_ids", [])],
            supervisor_doctor_id=str(data["supervisor_doctor_id"]) if data.get("supervisor_doctor_id") else None,
        )
        try:
            result = CreateUserUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result.__dict__, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
    """GET   /users/<id>/ — get user
       PATCH /users/<id>/ — update user (admin only)
       DELETE /users/<id>/ — deactivate user (admin only)"""
    permission_classes = [IsAuthenticated, AdminOnly]

    @extend_schema(tags=["users"], summary="Get user by ID")
    def get(self, request: Request, user_id: uuid.UUID) -> Response:
        with DjangoUnitOfWork() as uow:
            user = uow.users.get_by_id(user_id)
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "id": str(user.id),
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role.value,
            "chamber_ids": [str(c) for c in user.chamber_ids],
            "is_active": user.is_active,
            "supervisor_doctor_id": str(user.supervisor_id) if user.supervisor_id else None,
        })

    @extend_schema(
        tags=["users"],
        summary="Update user",
        description="Update name, email, role, is_active, or chamber assignments. All fields optional. Admin only.",
        request=UpdateUserSerializer,
        responses={200: UpdateUserSerializer, 400: OpenApiResponse(description="Validation error"), 404: OpenApiResponse(description="User not found")},
    )
    def patch(self, request: Request, user_id: uuid.UUID) -> Response:
        serializer = UpdateUserSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        dto = UpdateUserDTO(
            user_id=str(user_id),
            full_name=data.get("full_name"),
            email=data.get("email"),
            role=data.get("role"),
            is_active=data.get("is_active"),
            chamber_ids=[str(c) for c in data["chamber_ids"]] if "chamber_ids" in data else None,
            supervisor_doctor_id=str(data["supervisor_doctor_id"]) if data.get("supervisor_doctor_id") else ("" if "supervisor_doctor_id" in data else None),
        )
        try:
            result = UpdateUserUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result.__dict__)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(tags=["users"], summary="Deactivate user", responses={204: None, 404: OpenApiResponse(description="User not found")})
    def delete(self, request: Request, user_id: uuid.UUID) -> Response:
        try:
            DeactivateUserUseCase(uow=DjangoUnitOfWork()).execute(str(user_id))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_404_NOT_FOUND)
