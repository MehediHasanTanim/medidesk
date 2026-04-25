import csv
import io
import json
import uuid
from datetime import datetime, timezone

from django.http import HttpResponse
from drf_spectacular.utils import OpenApiParameter, extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.use_cases.audit.list_audit_logs import ListAuditLogsUseCase
from domain.repositories.i_audit_log_repository import AuditLogFilters
from infrastructure.repositories.django_audit_log_repository import DjangoAuditLogRepository
from interfaces.api.v1.audit_logs.serializers import AuditLogListResponseSerializer
from interfaces.permissions import AdminOnly

_CSV_EXPORT_MAX = 10_000   # safety ceiling for CSV exports


@extend_schema(
    tags=["audit-logs"],
    summary="List audit logs",
    description=(
        "Returns a paginated, filterable audit trail of all user activity. "
        "Admin and Super Admin only."
    ),
    parameters=[
        OpenApiParameter("user_id", OpenApiTypes.UUID, description="Filter by user UUID"),
        OpenApiParameter(
            "action", OpenApiTypes.STR,
            description="Filter by action: CREATE | UPDATE | DELETE | VIEW | LOGIN | LOGOUT",
        ),
        OpenApiParameter("resource_type", OpenApiTypes.STR, description="Filter by resource type"),
        OpenApiParameter("resource_id", OpenApiTypes.STR, description="Filter by resource ID"),
        OpenApiParameter("date_from", OpenApiTypes.DATETIME, description="Filter from this datetime (ISO 8601)"),
        OpenApiParameter("date_to", OpenApiTypes.DATETIME, description="Filter up to this datetime (ISO 8601)"),
        OpenApiParameter("page", OpenApiTypes.INT, description="Page number (default 1)"),
        OpenApiParameter("page_size", OpenApiTypes.INT, description="Results per page (default 50, max 200)"),
    ],
    responses={200: AuditLogListResponseSerializer},
)
class AuditLogListView(APIView):
    permission_classes = [IsAuthenticated, AdminOnly]

    def get(self, request: Request):
        params = request.query_params
        is_csv = params.get("format", "").lower() == "csv"

        user_id = None
        if raw_uid := params.get("user_id"):
            try:
                user_id = uuid.UUID(raw_uid)
            except ValueError:
                return Response({"error": "Invalid user_id"}, status=400)

        date_from = None
        if raw_df := params.get("date_from"):
            try:
                date_from = datetime.fromisoformat(raw_df).replace(tzinfo=timezone.utc)
            except ValueError:
                return Response({"error": "Invalid date_from — use ISO 8601"}, status=400)

        date_to = None
        if raw_dt := params.get("date_to"):
            try:
                date_to = datetime.fromisoformat(raw_dt).replace(tzinfo=timezone.utc)
            except ValueError:
                return Response({"error": "Invalid date_to — use ISO 8601"}, status=400)

        try:
            page = max(1, int(params.get("page", 1)))
            # CSV exports bypass the normal 200-row cap
            page_size = _CSV_EXPORT_MAX if is_csv else min(200, max(1, int(params.get("page_size", 50))))
        except ValueError:
            page, page_size = 1, 50

        filters = AuditLogFilters(
            user_id=user_id,
            action=params.get("action") or None,
            resource_type=params.get("resource_type") or None,
            resource_id=params.get("resource_id") or None,
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size,
        )

        result = ListAuditLogsUseCase(repo=DjangoAuditLogRepository()).execute(filters)

        # ── CSV download ──────────────────────────────────────────────────────
        if is_csv:
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow([
                "Timestamp", "User", "Action",
                "Resource Type", "Resource ID", "IP Address", "Payload",
            ])
            for r in result.results:
                writer.writerow([
                    r.timestamp,
                    r.user_name or "",
                    r.action,
                    r.resource_type,
                    r.resource_id or "",
                    r.ip_address or "",
                    json.dumps(r.payload) if r.payload else "",
                ])
            response = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = 'attachment; filename="audit-logs.csv"'
            return response

        # ── JSON (default) ────────────────────────────────────────────────────
        return Response(AuditLogListResponseSerializer({
            "results": [r.__dict__ for r in result.results],
            "count": result.count,
            "page": result.page,
            "page_size": result.page_size,
        }).data)
