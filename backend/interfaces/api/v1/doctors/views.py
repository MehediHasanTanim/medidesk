import uuid

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.doctor_dto import (
    ChamberScheduleDTO,
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
            "Filterable by speciality, availability, name search, or user_id (returns at most one)."
        ),
        parameters=[
            OpenApiParameter("speciality_id", str, description="Filter by speciality UUID."),
            OpenApiParameter("is_available", bool, description="Filter by availability."),
            OpenApiParameter("search", str, description="Search by name, qualifications, or speciality."),
            OpenApiParameter("user_id", str, description="Return the profile for this user UUID (at most one result)."),
        ],
        responses={200: DoctorProfileResponseSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        self.permission_classes = [IsAuthenticated]
        self.check_permissions(request)

        # Shortcut: look up a single profile by the doctor's user UUID
        user_id_str = request.query_params.get("user_id")
        if user_id_str:
            try:
                user_id = uuid.UUID(user_id_str)
            except ValueError:
                return Response({"error": "Invalid user_id"}, status=status.HTTP_400_BAD_REQUEST)
            from infrastructure.repositories.django_doctor_repository import DjangoDoctorRepository
            bare = DjangoDoctorRepository().get_profile_by_user_id(user_id)
            if not bare:
                return Response([])
            # Enrich via use case so serializer gets all required fields
            enriched = Container.get_doctor_profile().execute(str(bare.id))
            return Response(DoctorProfileResponseSerializer([enriched.__dict__], many=True).data)

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

        # Also include doctor-role users who have no profile yet
        from infrastructure.orm.models.doctor_model import DoctorProfileModel
        from infrastructure.orm.models.user_model import UserModel
        from application.dtos.doctor_dto import DoctorProfileDTO

        profiled_user_ids = set(DoctorProfileModel.objects.values_list("user_id", flat=True))
        stub_qs = UserModel.objects.prefetch_related("chambers").filter(
            role__in=["doctor", "assistant_doctor"],
            is_active=True,
        ).exclude(id__in=profiled_user_ids)

        # Apply search filter to stubs if provided
        if search:
            from django.db.models import Q
            stub_qs = stub_qs.filter(Q(full_name__icontains=search) | Q(username__icontains=search))

        # Exclude stubs when profile-specific filters are active
        if speciality_id or is_available is not None:
            stub_qs = stub_qs.none()

        stubs = [
            DoctorProfileDTO(
                id=str(u.id),
                user_id=str(u.id),
                username=u.username,
                full_name=u.full_name,
                email=u.email,
                role=u.role,
                is_active=u.is_active,
                speciality_id="",
                speciality_name="",
                qualifications="",
                bio="",
                consultation_fee=None,
                experience_years=None,
                is_available=True,
                visit_days=[],
                visit_time_start=None,
                visit_time_end=None,
                chamber_ids=[str(c.id) for c in u.chambers.all()],
                supervisor_doctor_id=str(u.supervisor_id) if u.supervisor_id else None,
                profile_complete=False,
                chamber_schedules=[],
            )
            for u in stub_qs
        ]

        all_profiles = result + stubs
        return Response(
            DoctorProfileResponseSerializer([d.__dict__ for d in all_profiles], many=True).data
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

        chamber_schedules = [
            ChamberScheduleDTO(
                chamber_id=str(cs["chamber_id"]),
                visit_days=cs.get("visit_days") or [],
                visit_time_start=cs["visit_time_start"].strftime("%H:%M") if cs.get("visit_time_start") else None,
                visit_time_end=cs["visit_time_end"].strftime("%H:%M") if cs.get("visit_time_end") else None,
            )
            for cs in (data.get("chamber_schedules") or [])
        ]

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
            supervisor_doctor_id=str(data["supervisor_doctor_id"]) if data.get("supervisor_doctor_id") else None,
            existing_user_id=str(data["existing_user_id"]) if data.get("existing_user_id") else None,
            chamber_schedules=chamber_schedules,
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

        raw_schedules = data.get("chamber_schedules")
        update_chamber_schedules = None
        if raw_schedules is not None:
            update_chamber_schedules = [
                ChamberScheduleDTO(
                    chamber_id=str(cs["chamber_id"]),
                    visit_days=cs.get("visit_days") or [],
                    visit_time_start=cs["visit_time_start"].strftime("%H:%M") if cs.get("visit_time_start") else None,
                    visit_time_end=cs["visit_time_end"].strftime("%H:%M") if cs.get("visit_time_end") else None,
                )
                for cs in raw_schedules
            ]

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
            supervisor_doctor_id=str(data["supervisor_doctor_id"]) if data.get("supervisor_doctor_id") else ("" if "supervisor_doctor_id" in data else None),
            chamber_schedules=update_chamber_schedules,
        )

        try:
            result = Container.update_doctor_profile().execute(dto)
            return Response(DoctorProfileResponseSerializer(result.__dict__).data)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
