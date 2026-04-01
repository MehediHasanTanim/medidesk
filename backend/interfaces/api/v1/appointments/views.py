import uuid
from datetime import date

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


class BookAppointmentView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "receptionist", "assistant"])]

    def post(self, request: Request) -> Response:
        serializer = BookAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        dto = BookAppointmentDTO(
            patient_id=str(data["patient_id"]),
            doctor_id=str(request.user.id),
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


class AppointmentStatusView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "receptionist"])]

    def patch(self, request: Request, appointment_id: uuid.UUID) -> Response:
        new_status = request.data.get("status")
        from infrastructure.repositories.django_appointment_repository import DjangoAppointmentRepository
        repo = DjangoAppointmentRepository()
        appt = repo.get_by_id(appointment_id)
        if not appt:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        appt.status = new_status  # type: ignore[assignment]
        repo.save(appt)
        return Response({"id": str(appt.id), "status": new_status})
