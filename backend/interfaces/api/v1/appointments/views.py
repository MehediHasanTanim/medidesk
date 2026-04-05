import uuid
from datetime import date

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.appointment_dto import BookAppointmentDTO
from interfaces.api.container import Container
from interfaces.api.v1.appointments.serializers import (
    AppointmentResponseSerializer,
    BookAppointmentSerializer,
    QueueItemSerializer,
)
from interfaces.permissions import RolePermission


@extend_schema(tags=["appointments"])
class BookAppointmentView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "receptionist", "assistant"])]

    def post(self, request: Request) -> Response:
        serializer = BookAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Doctors/assistant_doctors default to themselves; non-clinical roles must supply doctor_id
        user_role = getattr(request.user, "role", None)
        is_clinical = user_role in ("doctor", "assistant_doctor")
        provided_doctor_id = data.get("doctor_id")

        if is_clinical:
            doctor_id = str(provided_doctor_id) if provided_doctor_id else str(request.user.id)
        else:
            if not provided_doctor_id:
                return Response(
                    {"error": "doctor_id is required when booking on behalf of a doctor"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            doctor_id = str(provided_doctor_id)

        dto = BookAppointmentDTO(
            patient_id=str(data["patient_id"]),
            doctor_id=doctor_id,
            scheduled_at=data["scheduled_at"].isoformat(),
            appointment_type=data["appointment_type"],
            chamber_id=str(data["chamber_id"]) if data.get("chamber_id") else None,
            notes=data.get("notes", ""),
            created_by_id=str(request.user.id),
        )
        try:
            result = Container.book_appointment().execute(dto)
            return Response(AppointmentResponseSerializer(result.__dict__).data, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["appointments"])
class QueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        from infrastructure.repositories.django_appointment_repository import DjangoAppointmentRepository
        target_date_str = request.query_params.get("date", date.today().isoformat())
        chamber_id_str = request.query_params.get("chamber_id")

        target_date = date.fromisoformat(target_date_str)
        chamber_id = uuid.UUID(chamber_id_str) if chamber_id_str else None

        queue = DjangoAppointmentRepository().get_queue(target_date, chamber_id)
        return Response({
            "date": target_date_str,
            "total": len(queue),
            "queue": [QueueItemSerializer(a.__dict__).data for a in queue],
        })


@extend_schema(tags=["appointments"])
class AppointmentStatusView(APIView):
    """Generic status transitions (confirm, cancel, no_show, in_progress, completed)."""
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "assistant_doctor", "receptionist"])]

    def patch(self, request: Request, appointment_id: uuid.UUID) -> Response:
        from infrastructure.repositories.django_appointment_repository import DjangoAppointmentRepository
        from domain.entities.appointment import AppointmentStatus

        new_status = request.data.get("status")
        if not new_status:
            return Response({"error": "status is required"}, status=status.HTTP_400_BAD_REQUEST)

        repo = DjangoAppointmentRepository()
        appt = repo.get_by_id(appointment_id)
        if not appt:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            if new_status == AppointmentStatus.CONFIRMED:
                appt.confirm()
            elif new_status == AppointmentStatus.CANCELLED:
                appt.cancel()
            elif new_status == AppointmentStatus.NO_SHOW:
                appt.mark_no_show()
            elif new_status == AppointmentStatus.IN_PROGRESS:
                appt.mark_in_progress()
            elif new_status == AppointmentStatus.COMPLETED:
                appt.complete()
            else:
                return Response(
                    {"error": f"Use the dedicated check-in endpoint for '{new_status}' status"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        repo.save(appt)
        return Response({"id": str(appt.id), "status": appt.status.value})


@extend_schema(
    tags=["appointments"],
    summary="Check in patient",
    description=(
        "Mark a patient as arrived: assigns the next available queue token for the day "
        "and sets status to 'in_queue'. Accessible to receptionist and assistant."
    ),
)
class CheckInView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["receptionist", "assistant", "doctor"])]

    def post(self, request: Request, appointment_id: uuid.UUID) -> Response:
        from infrastructure.repositories.django_appointment_repository import DjangoAppointmentRepository

        repo = DjangoAppointmentRepository()
        appt = repo.get_by_id(appointment_id)
        if not appt:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        target_date = appt.scheduled_at.date()
        next_token = repo.get_next_token(target_date, appt.chamber_id)

        try:
            appt.check_in(token_number=next_token)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        repo.save(appt)
        return Response({
            "id": str(appt.id),
            "status": appt.status.value,
            "token_number": appt.token_number,
        }, status=status.HTTP_200_OK)
