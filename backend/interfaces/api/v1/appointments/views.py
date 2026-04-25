import hashlib
import json
import logging
import time
import uuid
from datetime import date

from django.db import close_old_connections
from django.http import StreamingHttpResponse
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from application.dtos.appointment_dto import BookAppointmentDTO, WalkInAppointmentDTO
from interfaces.api.container import Container
from interfaces.api.v1.appointments.serializers import (
    AppointmentListItemSerializer,
    AppointmentResponseSerializer,
    BookAppointmentSerializer,
    CheckInResponseSerializer,
    QueueItemSerializer,
    StatusUpdateSerializer,
    UpdateAppointmentSerializer,
    WalkInSerializer,
)
from interfaces.api.v1.mixins import AuditMixin
from interfaces.permissions import ModulePermission, ReceptionistChamberScopeMixin, RolePermission


def _apply_clinical_scope(request, qs):
    """
    For doctor/assistant_doctor roles, restrict the queryset to only appointments
    they are allowed to see:
      - doctor      → their own appointments, scoped to their assigned chambers
      - asst_doctor → their supervisor's appointments, scoped to their assigned chambers
    Returns (scoped_qs, error_response_or_None).
    """
    role = getattr(request.user, "role", None)
    if role not in ("doctor", "assistant_doctor"):
        return qs, None

    if role == "doctor":
        doctor_id = request.user.id
    else:
        doctor_id = getattr(request.user, "supervisor_id", None)
        if not doctor_id:
            # No supervisor assigned — show nothing
            return qs.none(), None

    qs = qs.filter(doctor_id=doctor_id)

    chamber_ids = list(request.user.chambers.values_list("id", flat=True))
    if chamber_ids:
        qs = qs.filter(chamber_id__in=chamber_ids)

    return qs, None


_AVG_CONSULTATION_MINUTES = 10  # assumed average consultation duration for ETA calculation


def _build_queue_items(request, target_date: date, chamber_id_str: str | None) -> dict:
    """Return serialised queue data for target_date, applying RBAC scoping.

    Returns a dict::
        {
          "queue": [<serialised QueueItem>, …],
          "now_serving": <token_number of in_progress patient> | None,
        }

    Each item carries two computed ETA fields:
      - ``queue_position``: 0 = currently in progress, 1 = next up, 2 = second, …
      - ``estimated_wait_minutes``: based on _AVG_CONSULTATION_MINUTES per slot.

    Shared between QueueView (REST) and QueueSSEView (streaming).
    """
    from infrastructure.orm.models.appointment_model import AppointmentModel
    from interfaces.api.v1.appointments.serializers import QueueItemSerializer

    qs = AppointmentModel.objects.filter(
        scheduled_at__date=target_date,
        status__in=["confirmed", "in_queue", "in_progress"],
    ).select_related("patient").order_by("token_number")

    qs, _ = _apply_clinical_scope(request, qs)

    role = getattr(request.user, "role", None)
    if role not in ("doctor", "assistant_doctor") and chamber_id_str:
        try:
            qs = qs.filter(chamber_id=uuid.UUID(chamber_id_str))
        except ValueError:
            pass

    # Separate in_progress from waiting to compute ETA correctly
    in_progress_rows = [m for m in qs if m.status == "in_progress"]
    waiting_rows = [m for m in qs if m.status in ("in_queue", "confirmed")]
    has_in_progress = len(in_progress_rows) > 0

    items = []

    # In-progress patients are being seen right now
    for m in in_progress_rows:
        items.append({
            "id": str(m.id),
            "token_number": m.token_number,
            "patient_id": str(m.patient_id),
            "patient_name": m.patient.full_name,
            "patient_phone": str(m.patient.phone),
            "scheduled_at": m.scheduled_at.isoformat(),
            "appointment_type": m.appointment_type,
            "status": m.status,
            "notes": m.notes or "",
            "queue_position": 0,
            "estimated_wait_minutes": 0,
        })

    # Waiting patients ranked 1, 2, 3…
    # When a consultation is in progress, the 1st-in-line waits one full slot;
    # when the doctor is free, the 1st-in-line waits 0 minutes.
    for rank, m in enumerate(waiting_rows, start=1):
        wait = rank * _AVG_CONSULTATION_MINUTES if has_in_progress else (rank - 1) * _AVG_CONSULTATION_MINUTES
        items.append({
            "id": str(m.id),
            "token_number": m.token_number,
            "patient_id": str(m.patient_id),
            "patient_name": m.patient.full_name,
            "patient_phone": str(m.patient.phone),
            "scheduled_at": m.scheduled_at.isoformat(),
            "appointment_type": m.appointment_type,
            "status": m.status,
            "notes": m.notes or "",
            "queue_position": rank,
            "estimated_wait_minutes": wait,
        })

    now_serving = in_progress_rows[0].token_number if in_progress_rows else None
    return {
        "queue": QueueItemSerializer(items, many=True).data,
        "now_serving": now_serving,
    }


class BookAppointmentView(AuditMixin, ReceptionistChamberScopeMixin, APIView):
    audit_resource_type = "appointment"
    permission_classes = [IsAuthenticated, ModulePermission("appointments")]

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

        qs, scope_err = _apply_clinical_scope(request, qs)
        if scope_err:
            return scope_err

        if pid := request.query_params.get("patient_id"):
            try:
                qs = qs.filter(patient_id=uuid.UUID(pid))
            except ValueError:
                return Response({"error": "Invalid patient_id."}, status=status.HTTP_400_BAD_REQUEST)

        # Only allow doctor_id filter for non-clinical roles; clinical roles are already scoped
        role = getattr(request.user, "role", None)
        if role not in ("doctor", "assistant_doctor"):
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

        # Doctors/assistant_doctors default to their own (or supervisor's) ID;
        # non-clinical roles must supply doctor_id explicitly.
        user_role = getattr(request.user, "role", None)
        is_clinical = user_role in ("doctor", "assistant_doctor")
        provided_doctor_id = data.get("doctor_id")

        if is_clinical:
            if provided_doctor_id:
                doctor_id = str(provided_doctor_id)
            elif user_role == "assistant_doctor":
                # Assistant doctors book under their supervisor, not themselves
                supervisor_id = getattr(request.user, "supervisor_id", None)
                if not supervisor_id:
                    return Response(
                        {"error": "No supervisor doctor assigned to your account. Please contact an admin."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                doctor_id = str(supervisor_id)
            else:
                doctor_id = str(request.user.id)
        else:
            if not provided_doctor_id:
                return Response(
                    {"error": "doctor_id is required when booking on behalf of a doctor"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            doctor_id = str(provided_doctor_id)

        chamber_id = str(data["chamber_id"]) if data.get("chamber_id") else None
        scope_err = self.check_chamber_scope(request, chamber_id)
        if scope_err:
            return scope_err

        dto = BookAppointmentDTO(
            patient_id=str(data["patient_id"]),
            doctor_id=doctor_id,
            scheduled_at=data["scheduled_at"].isoformat(),
            appointment_type=data["appointment_type"],
            chamber_id=chamber_id,
            notes=data.get("notes", ""),
            created_by_id=str(request.user.id),
        )
        try:
            result = Container.book_appointment().execute(dto)
            return Response(AppointmentResponseSerializer(result.__dict__).data, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class QueueView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission("appointments")]

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
        target_date_str = request.query_params.get("date", date.today().isoformat())
        chamber_id_str = request.query_params.get("chamber_id")

        try:
            target_date = date.fromisoformat(target_date_str)
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        result = _build_queue_items(request, target_date, chamber_id_str)
        return Response({
            "date": target_date_str,
            "total": len(result["queue"]),
            "queue": result["queue"],
            "now_serving": result["now_serving"],
        })


class AppointmentStatusView(AuditMixin, ReceptionistChamberScopeMixin, APIView):
    """Generic status transitions (confirm, cancel, no_show, in_progress, completed)."""
    audit_resource_type = "appointment"
    # ModulePermission enforces appointments.update from the matrix;
    # RolePermission further restricts status transitions to clinical+reception
    # staff only (assistant role may update appointment fields but not lifecycle status).
    permission_classes = [
        IsAuthenticated,
        ModulePermission("appointments"),
        RolePermission(["doctor", "assistant_doctor", "receptionist"]),
    ]

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

        scope_err = self.check_chamber_scope(request, appt.chamber_id)
        if scope_err:
            return scope_err

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


class AppointmentDetailView(AuditMixin, ReceptionistChamberScopeMixin, APIView):
    """Retrieve or edit a single appointment's fields (not status)."""
    audit_resource_type = "appointment"
    permission_classes = [IsAuthenticated, ModulePermission("appointments")]

    @extend_schema(
        tags=["appointments"],
        summary="Get appointment",
        description="Retrieve full details of a single appointment.",
        responses={200: AppointmentListItemSerializer},
    )
    def get(self, request: Request, appointment_id: uuid.UUID) -> Response:
        from infrastructure.orm.models.appointment_model import AppointmentModel

        try:
            m = AppointmentModel.objects.select_related("patient", "doctor").get(
                id=appointment_id
            )
        except AppointmentModel.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        data = {
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
        }
        return Response(AppointmentListItemSerializer(data).data)

    @extend_schema(
        tags=["appointments"],
        summary="Edit appointment",
        description=(
            "Update editable fields of an appointment. "
            "Only allowed when status is 'scheduled' or 'confirmed'. "
            "All fields are optional — only supplied fields are changed."
        ),
        request=UpdateAppointmentSerializer,
        responses={200: AppointmentListItemSerializer},
    )
    def patch(self, request: Request, appointment_id: uuid.UUID) -> Response:
        from infrastructure.orm.models.appointment_model import AppointmentModel
        from domain.entities.appointment import AppointmentStatus, AppointmentType
        from infrastructure.orm.models.user_model import UserModel

        EDIT_ROLES = {"doctor", "assistant_doctor", "receptionist", "assistant"}
        if getattr(request.user, "role", "") not in EDIT_ROLES:
            return Response(
                {"error": "Only clinical and reception staff can edit appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = UpdateAppointmentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        try:
            m = AppointmentModel.objects.select_related("patient", "doctor").get(
                id=appointment_id
            )
        except AppointmentModel.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        scope_err = self.check_chamber_scope(request, m.chamber_id)
        if scope_err:
            return scope_err

        # Only allow editing pre-arrival appointments
        if m.status not in (
            AppointmentStatus.SCHEDULED.value,
            AppointmentStatus.CONFIRMED.value,
        ):
            return Response(
                {"error": f"Cannot edit a '{m.status}' appointment. Only scheduled or confirmed appointments can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Apply changes
        if "scheduled_at" in data:
            m.scheduled_at = data["scheduled_at"]
        if "appointment_type" in data:
            m.appointment_type = data["appointment_type"]
        if "chamber_id" in data:
            m.chamber_id = data["chamber_id"]
        if "notes" in data:
            m.notes = data["notes"]
        if "doctor_id" in data:
            if data["doctor_id"] is None:
                return Response(
                    {"error": "doctor_id cannot be null"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Verify doctor exists
            if not UserModel.objects.filter(
                id=data["doctor_id"], role__in=["doctor", "assistant_doctor"]
            ).exists():
                return Response(
                    {"error": "Invalid doctor_id"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            m.doctor_id = data["doctor_id"]

        # Slot conflict check: only needed when scheduled_at or doctor_id changed
        if "scheduled_at" in data or "doctor_id" in data:
            from infrastructure.repositories.django_appointment_repository import DjangoAppointmentRepository
            repo = DjangoAppointmentRepository()
            if repo.has_conflict(m.doctor_id, m.scheduled_at, exclude_appointment_id=appointment_id):
                return Response(
                    {
                        "error": (
                            "This time slot is already booked for the selected doctor. "
                            "Please choose a different time (minimum 15-minute gap required)."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        m.save()

        # Re-fetch with related for response
        m.refresh_from_db()
        m = AppointmentModel.objects.select_related("patient", "doctor").get(id=m.id)

        response_data = {
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
        }
        return Response(AppointmentListItemSerializer(response_data).data)


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
class CheckInView(AuditMixin, ReceptionistChamberScopeMixin, APIView):
    # Check-in is a POST but semantically updates an appointment's status;
    audit_resource_type = "appointment"
    # action="update" maps this to the appointments.update matrix entry.
    permission_classes = [IsAuthenticated, ModulePermission("appointments", action="update")]

    def post(self, request: Request, appointment_id: uuid.UUID) -> Response:
        from infrastructure.repositories.django_appointment_repository import DjangoAppointmentRepository

        repo = DjangoAppointmentRepository()
        appt = repo.get_by_id(appointment_id)
        if not appt:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        scope_err = self.check_chamber_scope(request, appt.chamber_id)
        if scope_err:
            return scope_err

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


@extend_schema(
    tags=["appointments"],
    summary="Register walk-in patient",
    description=(
        "Create a walk-in appointment and immediately add the patient to today's queue. "
        "Sets scheduled_at to now (UTC), appointment_type to walk_in, and status to in_queue "
        "with the next available token — no separate check-in step required. "
        "Accessible to receptionist and assistant."
    ),
    request=WalkInSerializer,
    responses={201: AppointmentResponseSerializer},
)
class WalkInView(AuditMixin, ReceptionistChamberScopeMixin, APIView):
    audit_resource_type = "appointment"
    permission_classes = [
        IsAuthenticated,
        ModulePermission("appointments"),
        RolePermission(["receptionist", "assistant"]),
    ]

    def post(self, request: Request) -> Response:
        serializer = WalkInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        provided_doctor_id = data.get("doctor_id")
        if not provided_doctor_id:
            return Response(
                {"error": "doctor_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chamber_id = str(data["chamber_id"]) if data.get("chamber_id") else None
        scope_err = self.check_chamber_scope(request, chamber_id)
        if scope_err:
            return scope_err

        dto = WalkInAppointmentDTO(
            patient_id=str(data["patient_id"]),
            doctor_id=str(provided_doctor_id),
            chamber_id=chamber_id,
            notes=data.get("notes", ""),
            created_by_id=str(request.user.id),
        )
        try:
            result = Container.walk_in_appointment().execute(dto)
            return Response(AppointmentResponseSerializer(result.__dict__).data, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class QueueSSEView(APIView):
    """
    GET /appointments/queue/stream/

    Server-Sent Events endpoint for live queue updates.
    Pushes a new event whenever the queue changes (checked every 3 s).
    Sends a heartbeat comment every 30 s to prevent proxy timeouts.
    Automatically stops after 10 minutes — the client's EventSource will
    reconnect and resume seamlessly.

    Auth: reads the JWT access token from the ?token= query param because
    the browser EventSource API cannot set Authorization headers.

    Gunicorn note: each open SSE connection occupies one WSGI worker for its
    lifetime.  For a typical clinic (< 10 simultaneous viewers) this is fine.
    Consider async workers (--worker-class geventlet) for larger deployments.
    """
    from interfaces.api.v1.sse_auth import QueryParamJWTAuthentication
    authentication_classes = [QueryParamJWTAuthentication]
    permission_classes = [IsAuthenticated, ModulePermission("appointments")]

    _POLL_INTERVAL = 3       # seconds between DB checks
    _HEARTBEAT_EVERY = 10    # iterations between heartbeat comments (= 30 s)
    _MAX_ITERATIONS = 200    # stop after ~10 minutes; client auto-reconnects

    def get(self, request: Request) -> StreamingHttpResponse:
        target_date = date.today()
        chamber_id_str = request.query_params.get("chamber_id")

        def event_stream():
            last_hash = None
            heartbeat_counter = 0
            for _ in range(self._MAX_ITERATIONS):
                try:
                    close_old_connections()
                    result = _build_queue_items(request, target_date, chamber_id_str)
                    payload = json.dumps({
                        "date": target_date.isoformat(),
                        "total": len(result["queue"]),
                        "queue": list(result["queue"]),
                        "now_serving": result["now_serving"],
                    })
                    current_hash = hashlib.md5(payload.encode()).hexdigest()
                    if current_hash != last_hash:
                        last_hash = current_hash
                        yield f"data: {payload}\n\n"
                except Exception as exc:
                    logger.error("QueueSSE stream error: %s", exc)
                    yield f"event: error\ndata: {{}}\n\n"

                heartbeat_counter += 1
                if heartbeat_counter >= self._HEARTBEAT_EVERY:
                    yield ": ping\n\n"
                    heartbeat_counter = 0

                time.sleep(self._POLL_INTERVAL)

            # Signal the client to reconnect for a fresh stream
            yield "event: reconnect\ndata: {}\n\n"

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"   # disable nginx response buffering
        return response
