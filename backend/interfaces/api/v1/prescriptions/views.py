import uuid
from typing import Any, Dict, List

from django.db.models import Count, Q
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
from domain.entities.medicine import PrescriptionItem
from domain.value_objects.dosage import Dosage
from interfaces.api.v1.prescriptions.serializers import (
    ApproveResponseSerializer,
    CreatePrescriptionResponseSerializer,
    CreatePrescriptionSerializer,
    PendingPrescriptionSerializer,
    PrescriptionResponseSerializer,
    UpdatePrescriptionSerializer,
)
from interfaces.permissions import ADMIN_ROLES, ModulePermission, RolePermission


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
    permission_classes = [IsAuthenticated, ModulePermission("prescriptions")]

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
    GET   /prescriptions/<id>/  — retrieve a single prescription (clinical staff only).
    PATCH /prescriptions/<id>/  — edit items on a draft prescription (doctors only).
    """
    permission_classes = [IsAuthenticated, ModulePermission("prescriptions")]

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


    @extend_schema(
        summary="Edit prescription items",
        description=(
            "Replace the items on a **draft** prescription. "
            "Only doctors (and admins) may call this. "
            "Accepts the same item schema as create. "
            "Returns the updated full prescription."
        ),
        request=UpdatePrescriptionSerializer,
        responses={200: PrescriptionResponseSerializer},
    )
    def patch(self, request: Request, prescription_id: uuid.UUID) -> Response:
        # Only doctors (and admins) may edit draft prescriptions
        role = getattr(request.user, "role", "")
        if role not in ({"doctor"} | ADMIN_ROLES):
            return Response(
                {"error": "Only doctors can edit prescriptions"},
                status=status.HTTP_403_FORBIDDEN,
            )

        repo = DjangoPrescriptionRepository()
        prescription = repo.get_by_id(prescription_id)
        if not prescription:
            return Response({"error": "Prescription not found"}, status=status.HTTP_404_NOT_FOUND)

        if prescription.status.value != "draft":
            return Response(
                {"error": "Only draft prescriptions can be edited"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = UpdatePrescriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        prescription.items = [
            PrescriptionItem(
                medicine_id=item["medicine_id"],
                medicine_name=item["medicine_name"],
                dosage=Dosage(
                    morning=item["morning"] or "0",
                    afternoon=item["afternoon"] or "0",
                    evening=item["evening"] or "0",
                    duration_days=item["duration_days"],
                    instructions=item.get("instructions", ""),
                ),
                route=item.get("route", "oral"),
            )
            for item in data["items"]
        ]
        if "follow_up_date" in data:
            prescription.follow_up_date = data.get("follow_up_date")

        repo.save(prescription)
        return Response(_prescription_to_dict(prescription))


@extend_schema(tags=["prescriptions"])
class PrescriptionByConsultationView(APIView):
    """
    GET /prescriptions/consultation/<consultation_id>/  — fetch prescription for a consultation (clinical staff only).
    """
    permission_classes = [IsAuthenticated, ModulePermission("prescriptions")]

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
    # POST /approve/ is semantically an update (draft → approved).
    # RolePermission further restricts to doctor-only within prescriptions.update.
    permission_classes = [
        IsAuthenticated,
        ModulePermission("prescriptions", action="update"),
        RolePermission(["doctor"]),
    ]

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
        from infrastructure.orm.models.prescription_model import PrescriptionModel

        try:
            pm = PrescriptionModel.objects.select_related("consultation", "prescribed_by").get(id=prescription_id)
        except PrescriptionModel.DoesNotExist:
            return Response({"error": "Prescription not found"}, status=status.HTTP_404_NOT_FOUND)

        role = getattr(request.user, "role", "")
        if role == "doctor":
            is_own_consultation = str(pm.consultation.doctor_id) == str(request.user.id)
            is_supervised_assistant = (
                pm.prescribed_by is not None and
                str(getattr(pm.prescribed_by, "supervisor_id", None)) == str(request.user.id)
            )
            if not is_own_consultation and not is_supervised_assistant:
                return Response(
                    {"error": "You can only approve prescriptions from your own consultations or from your supervised assistant doctors"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        repo = DjangoPrescriptionRepository()
        prescription = repo.get_by_id(prescription_id)

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
    permission_classes = [IsAuthenticated, ModulePermission("prescriptions")]

    @extend_schema(
        summary="List pending prescriptions",
        description=(
            "**Doctor:** returns all draft prescriptions awaiting approval. "
            "**Assistant doctor:** returns only their own submitted drafts."
        ),
        responses={200: PendingPrescriptionSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        qs = (
            PrescriptionModel.objects
            .select_related("patient", "prescribed_by")
            .filter(status="draft")
        )

        role = getattr(request.user, "role", "")
        if role == "assistant_doctor":
            # assistant_doctor sees only their own submissions
            qs = qs.filter(prescribed_by_id=request.user.id)
        elif role == "doctor":
            # doctor sees drafts from their own consultations OR submitted by their supervised assistants
            qs = qs.filter(
                Q(consultation__doctor_id=request.user.id) |
                Q(prescribed_by__supervisor_id=request.user.id)
            )

        qs = (
            qs.annotate(item_count=Count("items"))
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
