from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from interfaces.api.v1.auth.serializers import CustomTokenObtainPairSerializer


@extend_schema(tags=["auth"])
class CustomTokenObtainPairView(TokenObtainPairView):
    """JWT login — returns access/refresh tokens plus user info in the body."""
    serializer_class = CustomTokenObtainPairSerializer


@extend_schema(tags=["auth"])
class MeView(APIView):
    """Returns the currently authenticated user's profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user = request.user
        return Response({
            "id": str(user.id),
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "chamber_ids": [str(c.id) for c in user.chambers.all()],
            "is_active": user.is_active,
        })

    def patch(self, request: Request) -> Response:
        """Update own profile (full_name, email only)."""
        from application.dtos.user_dto import UpdateUserDTO
        from application.use_cases.user.update_user import UpdateUserUseCase
        from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork

        allowed = {k: v for k, v in request.data.items() if k in ("full_name", "email")}
        if not allowed:
            return Response({"error": "Nothing to update"}, status=status.HTTP_400_BAD_REQUEST)

        dto = UpdateUserDTO(user_id=str(request.user.id), **allowed)
        try:
            result = UpdateUserUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result.__dict__)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["auth"])
class ChangePasswordView(APIView):
    """Allows authenticated users to change their own password."""
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        from application.dtos.user_dto import ChangePasswordDTO
        from application.use_cases.user.change_password import ChangePasswordUseCase
        from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork

        old_password = request.data.get("old_password", "")
        new_password = request.data.get("new_password", "")

        if not old_password or not new_password:
            return Response(
                {"error": "old_password and new_password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dto = ChangePasswordDTO(
            user_id=str(request.user.id),
            old_password=old_password,
            new_password=new_password,
        )
        try:
            ChangePasswordUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response({"message": "Password changed successfully"})
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
