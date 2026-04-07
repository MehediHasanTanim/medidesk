import uuid
from typing import Any, Dict, Optional

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from domain.entities.consultation import Consultation
from interfaces.api.container import Container
from interfaces.api.v1.consultations.serializers import (
    CompleteConsultationSerializer,
    ConsultationResponseSerializer,
    StartConsultationResponseSerializer,
    StartConsultationSerializer,
    UpdateConsultationSerializer,
    VitalsResponseSerializer,
    VitalsSerializer,
)
from interfaces.permissions import RolePermission


# ── Helper ────────────────────────────────────────────────────────────────────

def _consultation_to_dict(c: Consultation) -> Dict[str, Any]:
    v = c.vitals
    return {
        "id": str(c.id),
        "appointment_id": str(c.appointment_id),
        "patient_id": str(c.patient_id),
        "doctor_id": str(c.doctor_id),
        "chief_complaints": c.chief_complaints,
        "clinical_findings": c.clinical_findings,
        "diagnosis": c.diagnosis,
        "notes": c.notes,
        "is_draft": c.is_draft,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "completed_at": c.completed_at.isoformat() if c.completed_at else None,
        "vitals": {
            "bp_systolic": v.blood_pressure_systolic,
            "bp_diastolic": v.blood_pressure_diastolic,
            "bp_display": v.bp_display,
            "pulse": v.pulse,
            "temperature": v.temperature,
            "weight": v.weight,
            "height": v.height,
            "spo2": v.spo2,
            "bmi": v.bmi,
        } if v else None,
    }


# ── Views ─────────────────────────────────────────────────────────────────────

@extend_schema(tags=["consultations"])
class ConsultationListView(APIView):
    """
    GET  /consultations/  — list/fetch consultations (filter by appointment_id or patient_id)
    POST /consultations/  — start a new consultation
    """
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "assistant_doctor"])]

    @extend_schema(
        summary="List consultations",
        description=(
            "Fetch consultations filtered by **appointment_id** (returns at most one) "
            "or **patient_id** (returns all, newest first). "
            "One of the two query params is required."
        ),
        parameters=[
            OpenApiParameter("appointment_id", type=OpenApiTypes.UUID, location=OpenApiParameter.QUERY,
                             description="Return the consultation for this appointment."),
            OpenApiParameter("patient_id", type=OpenApiTypes.UUID, location=OpenApiParameter.QUERY,
                             description="Return all consultations for this patient."),
            OpenApiParameter("limit", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY,
                             description="Maximum results when filtering by patient (default 20).", required=False),
        ],
        responses={200: ConsultationResponseSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        from infrastructure.repositories.django_consultation_repository import DjangoConsultationRepository
        repo = DjangoConsultationRepository()

        appointment_id = request.query_params.get("appointment_id")
        patient_id = request.query_params.get("patient_id")
        limit = int(request.query_params.get("limit", 20))

        if appointment_id:
            c = repo.get_by_appointment(uuid.UUID(appointment_id))
            return Response([_consultation_to_dict(c)] if c else [])
        elif patient_id:
            consultations = repo.get_by_patient(uuid.UUID(patient_id), limit=limit)
            return Response([_consultation_to_dict(c) for c in consultations])
        else:
            return Response(
                {"error": "Provide appointment_id or patient_id as a query param"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @extend_schema(
        summary="Start consultation",
        description=(
            "Begin a new consultation for an in-queue appointment. "
            "Sets the appointment status to **in_progress**. "
            "The doctor is inferred from the authenticated user."
        ),
        request=StartConsultationSerializer,
        responses={201: StartConsultationResponseSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = StartConsultationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        from application.dtos.consultation_dto import StartConsultationDTO
        dto = StartConsultationDTO(
            appointment_id=str(d["appointment_id"]),
            patient_id=str(d["patient_id"]),
            doctor_id=str(request.user.id),
            chief_complaints=d["chief_complaints"],
        )
        try:
            result = Container.start_consultation().execute(dto)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["consultations"])
class ConsultationDetailView(APIView):
    """
    GET   /consultations/<id>/  — retrieve a single consultation
    PATCH /consultations/<id>/  — update text fields while still a draft
    """
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "assistant_doctor"])]

    @extend_schema(
        summary="Get consultation",
        responses={200: ConsultationResponseSerializer},
    )
    def get(self, request: Request, consultation_id: uuid.UUID) -> Response:
        from infrastructure.repositories.django_consultation_repository import DjangoConsultationRepository
        consultation = DjangoConsultationRepository().get_by_id(consultation_id)
        if not consultation:
            return Response({"error": "Consultation not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_consultation_to_dict(consultation))

    @extend_schema(
        summary="Update draft consultation",
        description=(
            "Partially update **chief_complaints**, **clinical_findings**, **diagnosis**, "
            "or **notes** while the consultation is still a draft (is_draft=true). "
            "Use PATCH /vitals/ to update vital signs separately."
        ),
        request=UpdateConsultationSerializer,
        responses={200: ConsultationResponseSerializer},
    )
    def patch(self, request: Request, consultation_id: uuid.UUID) -> Response:
        serializer = UpdateConsultationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        from application.dtos.consultation_dto import UpdateConsultationDTO
        dto = UpdateConsultationDTO(
            consultation_id=str(consultation_id),
            chief_complaints=d.get("chief_complaints"),
            clinical_findings=d.get("clinical_findings"),
            diagnosis=d.get("diagnosis"),
            notes=d.get("notes"),
        )
        try:
            consultation = Container.update_consultation().execute(dto)
            return Response(_consultation_to_dict(consultation))
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["consultations"])
class CompleteConsultationView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "assistant_doctor"])]

    @extend_schema(
        summary="Complete consultation",
        description=(
            "Finalise the consultation. **diagnosis** is required. "
            "Vitals may optionally be included in this call. "
            "Sets appointment status to **completed**. "
            "assistant_doctor may only complete consultations they started."
        ),
        request=CompleteConsultationSerializer,
        responses={200: StartConsultationResponseSerializer},
    )
    def post(self, request: Request, consultation_id: uuid.UUID) -> Response:
        # assistant_doctors may only complete consultations they started
        if getattr(request.user, "role", None) == "assistant_doctor":
            from infrastructure.repositories.django_consultation_repository import DjangoConsultationRepository
            consultation = DjangoConsultationRepository().get_by_id(consultation_id)
            if not consultation:
                return Response({"error": "Consultation not found"}, status=status.HTTP_404_NOT_FOUND)
            if str(consultation.doctor_id) != str(request.user.id):
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

        serializer = CompleteConsultationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        from application.dtos.consultation_dto import CompleteConsultationDTO
        dto = CompleteConsultationDTO(
            consultation_id=str(consultation_id),
            diagnosis=d["diagnosis"],
            clinical_findings=d.get("clinical_findings", ""),
            notes=d.get("notes", ""),
            bp_systolic=d.get("bp_systolic"),
            bp_diastolic=d.get("bp_diastolic"),
            pulse=d.get("pulse"),
            temperature=d.get("temperature"),
            weight=d.get("weight"),
            height=d.get("height"),
            spo2=d.get("spo2"),
        )
        try:
            result = Container.complete_consultation().execute(dto)
            return Response(result)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=["consultations"],
    summary="Record or update vitals",
    description=(
        "Update vitals (BP, pulse, temperature, weight, height, SpO₂) on an in-progress consultation. "
        "All fields are optional — send only the ones being recorded. "
        "Existing values are preserved for fields not included in the request. "
        "assistant_doctor may only update vitals on consultations they started."
    ),
    request=VitalsSerializer,
    responses={200: VitalsResponseSerializer},
)
class UpdateVitalsView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "assistant_doctor"])]

    def patch(self, request: Request, consultation_id: uuid.UUID) -> Response:
        from infrastructure.repositories.django_consultation_repository import DjangoConsultationRepository
        from domain.value_objects.vitals import Vitals

        serializer = VitalsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        repo = DjangoConsultationRepository()
        consultation = repo.get_by_id(consultation_id)
        if not consultation:
            return Response({"error": "Consultation not found"}, status=status.HTTP_404_NOT_FOUND)

        if getattr(request.user, "role", None) == "assistant_doctor":
            if str(consultation.doctor_id) != str(request.user.id):
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

        # Merge incoming fields onto existing vitals (keep existing values if not provided)
        existing = consultation.vitals
        consultation.vitals = Vitals(
            blood_pressure_systolic=data.get("bp_systolic", existing.blood_pressure_systolic if existing else None),
            blood_pressure_diastolic=data.get("bp_diastolic", existing.blood_pressure_diastolic if existing else None),
            pulse=data.get("pulse", existing.pulse if existing else None),
            temperature=data.get("temperature", existing.temperature if existing else None),
            weight=data.get("weight", existing.weight if existing else None),
            height=data.get("height", existing.height if existing else None),
            spo2=data.get("spo2", existing.spo2 if existing else None),
        )
        repo.save(consultation)

        v = consultation.vitals
        return Response({
            "consultation_id": str(consultation.id),
            "bp_systolic": v.blood_pressure_systolic,
            "bp_diastolic": v.blood_pressure_diastolic,
            "bp_display": v.bp_display,
            "pulse": v.pulse,
            "temperature": v.temperature,
            "weight": v.weight,
            "height": v.height,
            "spo2": v.spo2,
            "bmi": v.bmi,
        })
