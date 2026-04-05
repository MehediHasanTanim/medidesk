import uuid
from decimal import Decimal

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from interfaces.api.container import Container
from interfaces.api.v1.consultations.serializers import VitalsSerializer, VitalsResponseSerializer
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
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "assistant_doctor"])]

    def post(self, request: Request, consultation_id: uuid.UUID) -> Response:
        from decimal import Decimal
        from application.dtos.consultation_dto import CompleteConsultationDTO
        from infrastructure.repositories.django_consultation_repository import DjangoConsultationRepository

        # assistant_doctors may only complete consultations they started
        if getattr(request.user, "role", None) == "assistant_doctor":
            consultation = DjangoConsultationRepository().get_by_id(consultation_id)
            if not consultation:
                return Response({"error": "Consultation not found"}, status=status.HTTP_404_NOT_FOUND)
            if str(consultation.doctor_id) != str(request.user.id):
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

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


@extend_schema(
    tags=["consultations"],
    summary="Record or update vitals",
    description=(
        "Update vitals (BP, pulse, temperature, weight, height, SpO2) on an in-progress consultation. "
        "All fields are optional — send only the ones being recorded. "
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
