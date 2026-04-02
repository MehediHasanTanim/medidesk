import uuid

from drf_spectacular.utils import extend_schema
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


@extend_schema(tags=["users"])
class UserListView(APIView):
    """GET  /users/  — list all users (admin only)
       POST /users/  — create a new user (admin only)"""
    permission_classes = [IsAuthenticated, AdminOnly]

    def get(self, request: Request) -> Response:
        is_active = request.query_params.get("is_active")
        filter_active = None
        if is_active == "true":
            filter_active = True
        elif is_active == "false":
            filter_active = False

        with DjangoUnitOfWork() as uow:
            users = uow.users.list_all(is_active=filter_active)

        return Response([
            {
                "id": str(u.id),
                "username": u.username,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role.value,
                "chamber_ids": [str(c) for c in u.chamber_ids],
                "is_active": u.is_active,
            }
            for u in users
        ])

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
        )
        try:
            result = CreateUserUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result.__dict__, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["users"])
class UserDetailView(APIView):
    """GET   /users/<id>/ — get user
       PATCH /users/<id>/ — update user (admin only)
       DELETE /users/<id>/ — deactivate user (admin only)"""
    permission_classes = [IsAuthenticated, AdminOnly]

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
        })

    def patch(self, request: Request, user_id: uuid.UUID) -> Response:
        serializer = UpdateUserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        dto = UpdateUserDTO(
            user_id=str(user_id),
            full_name=data.get("full_name"),
            email=data.get("email"),
            role=data.get("role"),
            chamber_ids=[str(c) for c in data["chamber_ids"]] if "chamber_ids" in data else None,
        )
        try:
            result = UpdateUserUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result.__dict__)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request: Request, user_id: uuid.UUID) -> Response:
        try:
            DeactivateUserUseCase(uow=DjangoUnitOfWork()).execute(str(user_id))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_404_NOT_FOUND)
