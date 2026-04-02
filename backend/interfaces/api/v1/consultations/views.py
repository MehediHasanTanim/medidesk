import uuid

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from interfaces.api.container import Container
from interfaces.permissions import RolePermission


@extend_schema(tags=["consultations"])
class StartConsultationView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "assistant_doctor"])]

    def post(self, request: Request) -> Response:
        from application.dtos.consultation_dto import StartConsultationDTO
        from application.use_cases.consultation.start_consultation import StartConsultationUseCase
        from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork

        use_case = StartConsultationUseCase(uow=DjangoUnitOfWork())
        dto = StartConsultationDTO(
            appointment_id=request.data.get("appointment_id", ""),
            patient_id=request.data.get("patient_id", ""),
            doctor_id=str(request.user.id),
            chief_complaints=request.data.get("chief_complaints", ""),
        )
        try:
            result = use_case.execute(dto)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["consultations"])
class CompleteConsultationView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor"])]

    def post(self, request: Request, consultation_id: uuid.UUID) -> Response:
        from decimal import Decimal
        from application.dtos.consultation_dto import CompleteConsultationDTO

        dto = CompleteConsultationDTO(
            consultation_id=str(consultation_id),
            diagnosis=request.data.get("diagnosis", ""),
            clinical_findings=request.data.get("clinical_findings", ""),
            notes=request.data.get("notes", ""),
            bp_systolic=request.data.get("bp_systolic"),
            bp_diastolic=request.data.get("bp_diastolic"),
            pulse=request.data.get("pulse"),
            temperature=Decimal(str(request.data["temperature"])) if request.data.get("temperature") else None,
            weight=Decimal(str(request.data["weight"])) if request.data.get("weight") else None,
            height=Decimal(str(request.data["height"])) if request.data.get("height") else None,
            spo2=request.data.get("spo2"),
        )
        try:
            result = Container.complete_consultation().execute(dto)
            return Response(result)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
