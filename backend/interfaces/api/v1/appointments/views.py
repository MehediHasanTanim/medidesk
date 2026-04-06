import uuid
from datetime import date

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.appointment_dto import BookAppointmentDTO
from interfaces.api.container import Container
from interfaces.api.v1.appointments.serializers import (
    AppointmentListItemSerializer,
    AppointmentResponseSerializer,
    BookAppointmentSerializer,
    CheckInResponseSerializer,
    QueueItemSerializer,
    StatusUpdateSerializer,
)
from interfaces.permissions import RolePermission


class BookAppointmentView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "receptionist", "assistant"])]

    @extend_schema(
        tags=["appointments"],
        summary="List appointments",
        description=(
            "Return a list of appointments. Filterable by date, patient, doctor, and status. "
            "Defaults to today if no date is supplied."
        ),
        parameters=[
            OpenApiParameter("date", str, description="Filter by date (YYYY-MM-DD). Defaults to today."),
            OpenApiParameter("patient_id", str, description="Filter by patient UUID."),
            OpenApiParameter("doctor_id", str, description="Filter by doctor UUID."),
            OpenApiParameter("status", str, description="Filter by status (scheduled, confirmed, in_queue, …)."),
            OpenApiParameter("limit", int, description="Max results to return (default 50)."),
            OpenApiParameter("offset", int, description="Number of results to skip (default 0)."),
        ],
        responses={200: AppointmentListItemSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        from infrastructure.orm.models.appointment_model import AppointmentModel

        target_date_str = request.query_params.get("date", date.today().isoformat())
        try:
            target_date = date.fromisoformat(target_date_str)
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        limit = int(request.query_params.get("limit", 50))
        offset = int(request.query_params.get("offset", 0))

        qs = AppointmentModel.objects.filter(
            scheduled_at__date=target_date
        ).select_related("patient", "doctor").order_by("scheduled_at")

        if pid := request.query_params.get("patient_id"):
            try:
                qs = qs.filter(patient_id=uuid.UUID(pid))
            except ValueError:
                return Response({"error": "Invalid patient_id."}, status=status.HTTP_400_BAD_REQUEST)

        if did := request.query_params.get("doctor_id"):
            try:
                qs = qs.filter(doctor_id=uuid.UUID(did))
            except ValueError:
                return Response({"error": "Invalid doctor_id."}, status=status.HTTP_400_BAD_REQUEST)

        if st := request.query_params.get("status"):
            qs = qs.filter(status=st)

        total = qs.count()
        page_qs = qs[offset: offset + limit]

        items = []
        for m in page_qs:
            items.append({
                "id": str(m.id),
                "patient_id": str(m.patient_id),
                "patient_name": m.patient.full_name,
                "patient_phone": str(m.patient.phone),
                "doctor_id": str(m.doctor_id),
                "doctor_name": m.doctor.full_name,
                "chamber_id": str(m.chamber_id) if m.chamber_id else None,
                "scheduled_at": m.scheduled_at.isoformat(),
                "appointment_type": m.appointment_type,
                "status": m.status,
                "token_number": m.token_number,
                "notes": m.notes,
            })

        return Response({
            "count": total,
            "limit": limit,
            "offset": offset,
            "results": AppointmentListItemSerializer(items, many=True).data,
        })

    @extend_schema(
        tags=["appointments"],
        summary="Book appointment",
        description=(
            "Create a new appointment. Doctors and assistant_doctors default to themselves as the doctor. "
            "Receptionists and assistants must supply `doctor_id`."
        ),
        request=BookAppointmentSerializer,
        responses={201: AppointmentResponseSerializer},
    )
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


class QueueView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["appointments"],
        summary="Get today's queue",
        description=(
            "Returns appointments in active queue statuses (confirmed, in_queue, in_progress) "
            "ordered by token number. Optionally filter by chamber and/or date."
        ),
        parameters=[
            OpenApiParameter(
                "date", str,
                description="Queue date (YYYY-MM-DD). Defaults to today.",
            ),
            OpenApiParameter(
                "chamber_id", str,
                description="Filter queue to a specific chamber UUID.",
            ),
        ],
        responses={200: QueueItemSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        from infrastructure.orm.models.appointment_model import AppointmentModel

        target_date_str = request.query_params.get("date", date.today().isoformat())
        chamber_id_str = request.query_params.get("chamber_id")

        try:
            target_date = date.fromisoformat(target_date_str)
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        qs = AppointmentModel.objects.filter(
            scheduled_at__date=target_date,
            status__in=["confirmed", "in_queue", "in_progress"],
        ).select_related("patient").order_by("token_number")

        if chamber_id_str:
            try:
                qs = qs.filter(chamber_id=uuid.UUID(chamber_id_str))
            except ValueError:
                return Response({"error": "Invalid chamber_id."}, status=status.HTTP_400_BAD_REQUEST)

        items = []
        for m in qs:
            items.append({
                "id": str(m.id),
                "token_number": m.token_number,
                "patient_id": str(m.patient_id),
                "patient_name": m.patient.full_name,
                "patient_phone": str(m.patient.phone),
                "scheduled_at": m.scheduled_at.isoformat(),
                "appointment_type": m.appointment_type,
                "status": m.status,
                "notes": m.notes,
            })

        return Response({
            "date": target_date_str,
            "total": len(items),
            "queue": QueueItemSerializer(items, many=True).data,
        })


class AppointmentStatusView(APIView):
    """Generic status transitions (confirm, cancel, no_show, in_progress, completed)."""
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "assistant_doctor", "receptionist"])]

    @extend_schema(
        tags=["appointments"],
        summary="Update appointment status",
        description=(
            "Transition an appointment to a new status. "
            "Valid values: confirmed, cancelled, no_show, in_progress, completed. "
            "Use the dedicated `/check-in/` endpoint to set `in_queue`."
        ),
        request=StatusUpdateSerializer,
        responses={
            200: AppointmentResponseSerializer,
            400: None,
            404: None,
        },
    )
    def patch(self, request: Request, appointment_id: uuid.UUID) -> Response:
        from infrastructure.repositories.django_appointment_repository import DjangoAppointmentRepository
        from domain.entities.appointment import AppointmentStatus

        ser = StatusUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        new_status = ser.validated_data["status"]

        repo = DjangoAppointmentRepository()
        appt = repo.get_by_id(appointment_id)
        if not appt:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            if new_status == AppointmentStatus.CONFIRMED.value:
                appt.confirm()
            elif new_status == AppointmentStatus.CANCELLED.value:
                appt.cancel()
            elif new_status == AppointmentStatus.NO_SHOW.value:
                appt.mark_no_show()
            elif new_status == AppointmentStatus.IN_PROGRESS.value:
                appt.mark_in_progress()
            elif new_status == AppointmentStatus.COMPLETED.value:
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
    request=None,
    responses={200: CheckInResponseSerializer},
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
