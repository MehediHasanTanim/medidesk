import uuid
from typing import Any, Dict, List

from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.prescription_dto import CreatePrescriptionDTO, PrescriptionItemDTO
from application.use_cases.prescription.create_prescription import CreatePrescriptionUseCase
from domain.entities.prescription import Prescription
from infrastructure.orm.models.prescription_model import PrescriptionModel
from infrastructure.repositories.django_prescription_repository import DjangoPrescriptionRepository
from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
from interfaces.api.v1.prescriptions.serializers import (
    ApproveResponseSerializer,
    CreatePrescriptionResponseSerializer,
    CreatePrescriptionSerializer,
    PendingPrescriptionSerializer,
    PrescriptionResponseSerializer,
)
from interfaces.permissions import RolePermission


# ── Helper ────────────────────────────────────────────────────────────────────

def _prescription_to_dict(p: Prescription) -> Dict[str, Any]:
    return {
        "prescription_id": str(p.id),
        "consultation_id": str(p.consultation_id),
        "patient_id": str(p.patient_id),
        "prescribed_by_id": str(p.prescribed_by_id),
        "approved_by_id": str(p.approved_by_id) if p.approved_by_id else None,
        "status": p.status.value,
        "follow_up_date": str(p.follow_up_date) if p.follow_up_date else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "items": [
            {
                "medicine_id": str(item.medicine_id),
                "medicine_name": item.medicine_name,
                "morning": item.dosage.morning,
                "afternoon": item.dosage.afternoon,
                "evening": item.dosage.evening,
                "duration_days": item.dosage.duration_days,
                "dosage_display": str(item.dosage),
                "route": item.route,
                "instructions": item.dosage.instructions,
            }
            for item in p.items
        ],
    }


# ── Views ─────────────────────────────────────────────────────────────────────

@extend_schema(tags=["prescriptions"])
class PrescriptionView(APIView):
    """
    POST /prescriptions/  — create a prescription for a completed consultation.
    """
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "assistant_doctor"])]

    @extend_schema(
        summary="Create prescription",
        description=(
            "Create a prescription linked to a consultation. "
            "**doctor** prescriptions are immediately **active**. "
            "**assistant_doctor** prescriptions are set to **draft** and require doctor approval."
        ),
        request=CreatePrescriptionSerializer,
        responses={201: CreatePrescriptionResponseSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = CreatePrescriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        item_dtos = [
            PrescriptionItemDTO(
                medicine_id=str(item["medicine_id"]),
                medicine_name=item["medicine_name"],
                morning=item["morning"],
                afternoon=item["afternoon"],
                evening=item["evening"],
                duration_days=item["duration_days"],
                route=item.get("route", "oral"),
                instructions=item.get("instructions", ""),
            )
            for item in data["items"]
        ]

        dto = CreatePrescriptionDTO(
            consultation_id=str(data["consultation_id"]),
            patient_id=str(data["patient_id"]),
            prescribed_by_id=str(request.user.id),
            prescribed_by_role=getattr(request.user, "role", "doctor"),
            items=item_dtos,
            follow_up_date=str(data["follow_up_date"]) if data.get("follow_up_date") else None,
        )

        try:
            result = CreatePrescriptionUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["prescriptions"])
class PrescriptionDetailView(APIView):
    """
    GET /prescriptions/<id>/  — retrieve a single prescription by its own ID.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get prescription",
        description="Retrieve full prescription details including all items and dosage breakdown.",
        responses={200: PrescriptionResponseSerializer},
    )
    def get(self, request: Request, prescription_id: uuid.UUID) -> Response:
        prescription = DjangoPrescriptionRepository().get_by_id(prescription_id)
        if not prescription:
            return Response({"error": "Prescription not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_prescription_to_dict(prescription))


@extend_schema(tags=["prescriptions"])
class PrescriptionByConsultationView(APIView):
    """
    GET /prescriptions/consultation/<consultation_id>/  — fetch prescription for a consultation.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get prescription by consultation",
        description=(
            "Retrieve the prescription attached to a specific consultation. "
            "Returns the full prescription with all structured item fields."
        ),
        responses={200: PrescriptionResponseSerializer},
    )
    def get(self, request: Request, consultation_id: uuid.UUID) -> Response:
        repo = DjangoPrescriptionRepository()
        prescription = repo.get_by_consultation(consultation_id)
        if not prescription:
            return Response({"error": "Prescription not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_prescription_to_dict(prescription))


@extend_schema(tags=["prescriptions"])
class ApprovePrescriptionView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor"])]

    @extend_schema(
        summary="Approve a draft prescription",
        description=(
            "Approve a prescription that was drafted by an assistant_doctor. "
            "Only full doctors may approve. Sets status from **draft** → **approved**."
        ),
        request=None,
        responses={200: ApproveResponseSerializer},
    )
    def post(self, request: Request, prescription_id: uuid.UUID) -> Response:
        repo = DjangoPrescriptionRepository()
        prescription = repo.get_by_id(prescription_id)
        if not prescription:
            return Response({"error": "Prescription not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            prescription.approve(approver_id=request.user.id)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        repo.save(prescription)
        return Response({
            "prescription_id": str(prescription.id),
            "status": prescription.status.value,
            "approved_by_id": str(prescription.approved_by_id),
        })


@extend_schema(tags=["prescriptions"])
class PendingPrescriptionsView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor"])]

    @extend_schema(
        summary="List pending prescriptions",
        description=(
            "List all **draft** prescriptions awaiting doctor approval, "
            "ordered by creation time (oldest first). Accessible to doctors only."
        ),
        responses={200: PendingPrescriptionSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        qs = (
            PrescriptionModel.objects
            .select_related("patient", "prescribed_by")
            .filter(status="draft")
            .annotate(item_count=Count("items"))
            .order_by("created_at")[:50]
        )
        return Response([
            {
                "prescription_id": str(p.id),
                "consultation_id": str(p.consultation_id),
                "patient_id": str(p.patient_id),
                "patient_name": p.patient.full_name,
                "prescribed_by_id": str(p.prescribed_by_id),
                "prescribed_by_name": p.prescribed_by.full_name,
                "status": p.status,
                "follow_up_date": str(p.follow_up_date) if p.follow_up_date else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "item_count": p.item_count,
            }
            for p in qs
        ])
