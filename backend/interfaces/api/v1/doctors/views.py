import uuid

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.doctor_dto import (
    CreateDoctorProfileDTO,
    CreateSpecialityDTO,
    UpdateDoctorProfileDTO,
    UpdateSpecialityDTO,
)
from interfaces.api.container import Container
from interfaces.api.v1.doctors.serializers import (
    CreateDoctorProfileSerializer,
    CreateSpecialitySerializer,
    DoctorProfileResponseSerializer,
    SpecialityResponseSerializer,
    UpdateDoctorProfileSerializer,
    UpdateSpecialitySerializer,
)
from interfaces.permissions import AdminOnly


# ── Specialities ──────────────────────────────────────────────────────────────

class SpecialityListView(APIView):

    @extend_schema(
        tags=["doctors"],
        summary="List specialities",
        description="Returns all active specialities with doctor count. Pass `active_only=false` to include inactive ones.",
        parameters=[
            OpenApiParameter("active_only", bool, description="Filter to active only (default true)."),
        ],
        responses={200: SpecialityResponseSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        active_only = request.query_params.get("active_only", "true").lower() != "false"
        result = Container.list_specialities().execute(active_only=active_only)
        return Response(SpecialityResponseSerializer([s.__dict__ for s in result], many=True).data)

    @extend_schema(
        tags=["doctors"],
        summary="Create speciality",
        description="Create a new speciality. Admin/Super Admin only.",
        request=CreateSpecialitySerializer,
        responses={201: SpecialityResponseSerializer},
    )
    def post(self, request: Request) -> Response:
        self.permission_classes = [IsAuthenticated, AdminOnly]
        self.check_permissions(request)

        ser = CreateSpecialitySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        try:
            result = Container.create_speciality().execute(
                CreateSpecialityDTO(
                    name=data["name"],
                    description=data.get("description", ""),
                )
            )
            return Response(result.__dict__, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class SpecialityDetailView(APIView):
    permission_classes = [IsAuthenticated, AdminOnly]

    @extend_schema(
        tags=["doctors"],
        summary="Update speciality",
        request=UpdateSpecialitySerializer,
        responses={200: SpecialityResponseSerializer},
    )
    def patch(self, request: Request, speciality_id: uuid.UUID) -> Response:
        ser = UpdateSpecialitySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        try:
            result = Container.update_speciality().execute(
                UpdateSpecialityDTO(
                    speciality_id=str(speciality_id),
                    name=data.get("name"),
                    description=data.get("description"),
                    is_active=data.get("is_active"),
                )
            )
            return Response(result.__dict__)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        tags=["doctors"],
        summary="Delete speciality",
        description="Permanently deletes a speciality. Fails if any doctors are assigned to it.",
        responses={204: None, 400: None},
    )
    def delete(self, request: Request, speciality_id: uuid.UUID) -> Response:
        try:
            Container.delete_speciality().execute(str(speciality_id))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


# ── Doctor Profiles ───────────────────────────────────────────────────────────

class DoctorProfileListView(APIView):

    @extend_schema(
        tags=["doctors"],
        summary="List doctor profiles",
        description=(
            "Returns all doctor profiles enriched with user info, speciality, and chambers. "
            "Filterable by speciality, availability, and name search."
        ),
        parameters=[
            OpenApiParameter("speciality_id", str, description="Filter by speciality UUID."),
            OpenApiParameter("is_available", bool, description="Filter by availability."),
            OpenApiParameter("search", str, description="Search by name, qualifications, or speciality."),
        ],
        responses={200: DoctorProfileResponseSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        self.permission_classes = [IsAuthenticated]
        self.check_permissions(request)

        speciality_id = request.query_params.get("speciality_id")
        is_available_str = request.query_params.get("is_available")
        is_available = None
        if is_available_str is not None:
            is_available = is_available_str.lower() == "true"
        search = request.query_params.get("search")

        result = Container.list_doctor_profiles().execute(
            speciality_id=speciality_id,
            is_available=is_available,
            search=search,
        )
        return Response(
            DoctorProfileResponseSerializer([d.__dict__ for d in result], many=True).data
        )

    @extend_schema(
        tags=["doctors"],
        summary="Create doctor profile",
        description=(
            "Creates a new user with role doctor/assistant_doctor and their profile in one step. "
            "Admin/Super Admin only."
        ),
        request=CreateDoctorProfileSerializer,
        responses={201: DoctorProfileResponseSerializer},
    )
    def post(self, request: Request) -> Response:
        self.permission_classes = [IsAuthenticated, AdminOnly]
        self.check_permissions(request)

        ser = CreateDoctorProfileSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        dto = CreateDoctorProfileDTO(
            username=data["username"],
            password=data["password"],
            full_name=data["full_name"],
            email=data["email"],
            role=data.get("role", "doctor"),
            speciality_id=str(data["speciality_id"]),
            qualifications=data["qualifications"],
            bio=data.get("bio", ""),
            consultation_fee=data.get("consultation_fee"),
            experience_years=data.get("experience_years"),
            is_available=data.get("is_available", True),
            visit_days=data.get("visit_days") or [],
            visit_time_start=data["visit_time_start"].strftime("%H:%M") if data.get("visit_time_start") else None,
            visit_time_end=data["visit_time_end"].strftime("%H:%M") if data.get("visit_time_end") else None,
            chamber_ids=[str(c) for c in (data.get("chamber_ids") or [])],
        )

        try:
            result = Container.create_doctor_profile().execute(dto)
            return Response(result.__dict__, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class DoctorProfileDetailView(APIView):

    @extend_schema(
        tags=["doctors"],
        summary="Get doctor profile",
        responses={200: DoctorProfileResponseSerializer},
    )
    def get(self, request: Request, profile_id: uuid.UUID) -> Response:
        self.permission_classes = [IsAuthenticated]
        self.check_permissions(request)

        try:
            result = Container.get_doctor_profile().execute(str(profile_id))
            return Response(DoctorProfileResponseSerializer(result.__dict__).data)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_404_NOT_FOUND)

    @extend_schema(
        tags=["doctors"],
        summary="Update doctor profile",
        description=(
            "Update user and/or profile fields. All fields optional. "
            "Admin/Super Admin only."
        ),
        request=UpdateDoctorProfileSerializer,
        responses={200: DoctorProfileResponseSerializer},
    )
    def patch(self, request: Request, profile_id: uuid.UUID) -> Response:
        self.permission_classes = [IsAuthenticated, AdminOnly]
        self.check_permissions(request)

        ser = UpdateDoctorProfileSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        dto = UpdateDoctorProfileDTO(
            profile_id=str(profile_id),
            full_name=data.get("full_name"),
            email=data.get("email"),
            role=data.get("role"),
            is_active=data.get("is_active"),
            speciality_id=str(data["speciality_id"]) if data.get("speciality_id") else None,
            qualifications=data.get("qualifications"),
            bio=data.get("bio"),
            consultation_fee=data.get("consultation_fee"),
            experience_years=data.get("experience_years"),
            is_available=data.get("is_available"),
            visit_days=data.get("visit_days"),
            visit_time_start=data["visit_time_start"].strftime("%H:%M") if data.get("visit_time_start") else None,
            visit_time_end=data["visit_time_end"].strftime("%H:%M") if data.get("visit_time_end") else None,
            chamber_ids=[str(c) for c in data["chamber_ids"]] if data.get("chamber_ids") is not None else None,
        )

        try:
            result = Container.update_doctor_profile().execute(dto)
            return Response(DoctorProfileResponseSerializer(result.__dict__).data)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
