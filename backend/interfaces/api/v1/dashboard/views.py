from django.db.models import Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from infrastructure.orm.models.appointment_model import AppointmentModel
from infrastructure.orm.models.billing_model import InvoiceModel, PaymentModel
from infrastructure.orm.models.prescription_model import PrescriptionModel
from interfaces.permissions import ADMIN_ROLES


@extend_schema(tags=["dashboard"])
class DashboardView(APIView):
    """
    GET /dashboard/  — Returns role-specific stats for the current user.

    Doctor / Assistant doctor:
        today_appointments, pending_rx_approvals, today_revenue (doctor only)

    Receptionist / Assistant:
        queue_total, queue_waiting, queue_in_progress, queue_done,
        pending_invoices, today_collected

    Trainee:
        today_appointments (read-only observer view)

    Admin / Super admin:
        today_appointments, queue_waiting, today_revenue, pending_rx_approvals
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Dashboard stats",
        description="Returns role-specific stats for today's overview panel.",
    )
    def get(self, request: Request) -> Response:
        user = request.user
        role = getattr(user, "role", None)
        today = timezone.localdate()

        if role in ADMIN_ROLES:
            return Response(self._admin_stats(today))
        if role in ("doctor", "assistant_doctor"):
            return Response(self._doctor_stats(user, role, today))
        if role in ("receptionist", "assistant"):
            return Response(self._reception_stats(today))
        if role == "trainee":
            return Response(self._trainee_stats(today))
        return Response({"role": role})

    # ── Doctor / Assistant doctor ─────────────────────────────────────────────

    def _doctor_stats(self, user, role: str, today) -> dict:
        today_appointments = (
            AppointmentModel.objects
            .filter(doctor=user, scheduled_at__date=today)
            .exclude(status__in=("cancelled", "no_show"))
            .count()
        )

        pending_rx_qs = PrescriptionModel.objects.filter(status="draft")
        if role == "assistant_doctor":
            pending_rx_qs = pending_rx_qs.filter(prescribed_by=user)
        pending_rx_approvals = pending_rx_qs.count()

        stats: dict = {
            "role": role,
            "today_appointments": today_appointments,
            "pending_rx_approvals": pending_rx_approvals,
        }

        if role == "doctor":
            revenue = (
                PaymentModel.objects
                .filter(paid_at__date=today, invoice__consultation__doctor=user)
                .aggregate(total=Sum("amount"))["total"]
                or 0
            )
            stats["today_revenue"] = float(revenue)

        return stats

    # ── Receptionist / Assistant ──────────────────────────────────────────────

    def _reception_stats(self, today) -> dict:
        active_today = AppointmentModel.objects.filter(
            scheduled_at__date=today,
        ).exclude(status__in=("cancelled", "no_show"))

        queue_total = active_today.count()
        queue_waiting = active_today.filter(status="in_queue").count()
        queue_in_progress = active_today.filter(status="in_progress").count()
        queue_done = active_today.filter(status="completed").count()

        # All outstanding invoices (not just today) — reflects backlog
        pending_invoices = InvoiceModel.objects.filter(
            status__in=("draft", "issued")
        ).count()

        today_collected = (
            PaymentModel.objects
            .filter(paid_at__date=today)
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )

        return {
            "role": "receptionist",
            "queue_total": queue_total,
            "queue_waiting": queue_waiting,
            "queue_in_progress": queue_in_progress,
            "queue_done": queue_done,
            "pending_invoices": pending_invoices,
            "today_collected": float(today_collected),
        }

    # ── Trainee ──────────────────────────────────────────────────────────────

    def _trainee_stats(self, today) -> dict:
        today_appointments = (
            AppointmentModel.objects
            .filter(scheduled_at__date=today)
            .exclude(status__in=("cancelled", "no_show"))
            .count()
        )
        return {
            "role": "trainee",
            "today_appointments": today_appointments,
        }

    # ── Admin / Super admin ───────────────────────────────────────────────────

    def _admin_stats(self, today) -> dict:
        today_appointments = (
            AppointmentModel.objects
            .filter(scheduled_at__date=today)
            .exclude(status__in=("cancelled", "no_show"))
            .count()
        )

        queue_waiting = AppointmentModel.objects.filter(
            scheduled_at__date=today, status="in_queue"
        ).count()

        today_revenue = (
            PaymentModel.objects
            .filter(paid_at__date=today)
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )

        pending_rx_approvals = PrescriptionModel.objects.filter(status="draft").count()

        return {
            "role": "admin",
            "today_appointments": today_appointments,
            "queue_waiting": queue_waiting,
            "today_revenue": float(today_revenue),
            "pending_rx_approvals": pending_rx_approvals,
        }
