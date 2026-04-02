import uuid

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.prescription_dto import CreatePrescriptionDTO, PrescriptionItemDTO
from application.use_cases.prescription.create_prescription import CreatePrescriptionUseCase
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
            "follow_up_date": str(prescription.follow_up_date) if prescription.follow_up_date else None,
            "items": items,
        })
