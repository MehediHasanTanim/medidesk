import uuid

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.prescription_dto import CreatePrescriptionDTO, PrescriptionItemDTO
from application.use_cases.prescription.create_prescription import CreatePrescriptionUseCase
from infrastructure.repositories.django_prescription_repository import DjangoPrescriptionRepository
from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
from interfaces.api.v1.prescriptions.serializers import CreatePrescriptionSerializer
from interfaces.permissions import RolePermission


@extend_schema(tags=["prescriptions"])
class PrescriptionView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "assistant_doctor"])]

    def post(self, request: Request) -> Response:
        serializer = CreatePrescriptionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
class PrescriptionByConsultationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, consultation_id: uuid.UUID) -> Response:
        with DjangoUnitOfWork() as uow:
            prescription = uow.prescriptions.get_by_consultation(consultation_id)
        if not prescription:
            return Response({"error": "Prescription not found"}, status=status.HTTP_404_NOT_FOUND)

        items = [
            {
                "medicine_id": str(item.medicine_id),
                "medicine_name": item.medicine_name,
                "dosage": str(item.dosage),
                "route": item.route,
                "instructions": item.dosage.instructions,
            }
            for item in prescription.items
        ]
        return Response({
            "prescription_id": str(prescription.id),
            "consultation_id": str(prescription.consultation_id),
            "patient_id": str(prescription.patient_id),
            "status": prescription.status.value,
            "approved_by_id": str(prescription.approved_by_id) if prescription.approved_by_id else None,
            "follow_up_date": str(prescription.follow_up_date) if prescription.follow_up_date else None,
            "items": items,
        })


@extend_schema(
    tags=["prescriptions"],
    summary="Approve a draft prescription",
    description="Approve a prescription drafted by an assistant_doctor. Only doctors can approve. Sets status to 'approved'.",
)
class ApprovePrescriptionView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor"])]

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


@extend_schema(
    tags=["prescriptions"],
    summary="List pending prescriptions",
    description="List all draft prescriptions awaiting doctor approval. Accessible to doctors only.",
)
class PendingPrescriptionsView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor"])]

    def get(self, request: Request) -> Response:
        prescriptions = DjangoPrescriptionRepository().list_pending()
        return Response([
            {
                "prescription_id": str(p.id),
                "consultation_id": str(p.consultation_id),
                "patient_id": str(p.patient_id),
                "prescribed_by_id": str(p.prescribed_by_id),
                "status": p.status.value,
                "follow_up_date": str(p.follow_up_date) if p.follow_up_date else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "item_count": len(p.items),
            }
            for p in prescriptions
        ])
