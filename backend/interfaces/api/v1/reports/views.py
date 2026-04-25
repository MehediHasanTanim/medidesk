import mimetypes
import os
import uuid

from django.http import FileResponse, HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from interfaces.api.v1.reports.serializers import UploadReportSerializer, ReportResponseSerializer
from infrastructure.services.audit_service import get_audit_service
from interfaces.api.v1.mixins import AuditMixin, _get_client_ip
from interfaces.permissions import ModulePermission


def _report_to_dict(report, request) -> dict:
    return {
        "id": str(report.id),
        "patient_id": str(report.patient_id),
        "consultation_id": str(report.consultation_id) if report.consultation_id else None,
        "test_order_id": str(report.test_order_id) if report.test_order_id else None,
        "category": report.category,
        "file_url": report.file.url,   # relative path (/media/...) — proxied by frontend dev server; nginx serves it in prod
        "original_filename": report.original_filename,
        "uploaded_by_name": report.uploaded_by.full_name if report.uploaded_by else "",
        "uploaded_at": report.uploaded_at.isoformat(),
        "notes": report.notes,
    }


@extend_schema(tags=["reports"])
class ReportUploadView(AuditMixin, APIView):
    """
    POST /reports/  — upload a patient report document (multipart/form-data)
    GET  /reports/?patient_id=<uuid>[&consultation_id=<uuid>]  — list reports
    """
    audit_resource_type = "report"
    permission_classes = [IsAuthenticated, ModulePermission("reports")]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        summary="Upload a report",
        description=(
            "Upload a report file (PDF, image, etc.) for a patient. "
            "Optionally link it to a consultation. "
            "assistant_doctor may only upload reports for patients in their consultation list."
        ),
        request=UploadReportSerializer,
        responses={201: ReportResponseSerializer},
    )
    def post(self, request: Request) -> Response:
        from infrastructure.orm.models.test_order_model import ReportDocumentModel
        from infrastructure.orm.models.patient_model import PatientModel

        serializer = UploadReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient_id = data["patient_id"]

        try:
            patient = PatientModel.objects.get(id=patient_id)
        except PatientModel.DoesNotExist:
            return Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

        uploaded_file = data["file"]
        report = ReportDocumentModel.objects.create(
            patient=patient,
            consultation_id=data.get("consultation_id"),
            test_order_id=data.get("test_order_id"),
            category=data["category"],
            file=uploaded_file,
            original_filename=uploaded_file.name,
            uploaded_by=request.user,
            notes=data.get("notes", ""),
        )

        return Response(_report_to_dict(report, request), status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="List reports for a patient",
        description="List uploaded reports. Filter by patient_id (required) and optionally by consultation_id.",
        responses={200: ReportResponseSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        from infrastructure.orm.models.test_order_model import ReportDocumentModel

        patient_id_str = request.query_params.get("patient_id")
        if not patient_id_str:
            return Response({"error": "patient_id query param is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            patient_id = uuid.UUID(patient_id_str)
        except ValueError:
            return Response({"error": "Invalid patient_id"}, status=status.HTTP_400_BAD_REQUEST)

        qs = ReportDocumentModel.objects.filter(patient_id=patient_id).select_related("uploaded_by").order_by("-uploaded_at")

        consultation_id_str = request.query_params.get("consultation_id")
        if consultation_id_str:
            try:
                qs = qs.filter(consultation_id=uuid.UUID(consultation_id_str))
            except ValueError:
                return Response({"error": "Invalid consultation_id"}, status=status.HTTP_400_BAD_REQUEST)

        test_order_id_str = request.query_params.get("test_order_id")
        if test_order_id_str:
            try:
                qs = qs.filter(test_order_id=uuid.UUID(test_order_id_str))
            except ValueError:
                return Response({"error": "Invalid test_order_id"}, status=status.HTTP_400_BAD_REQUEST)

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        return Response([_report_to_dict(r, request) for r in qs])


@extend_schema(tags=["reports"])
class ReportFileView(APIView):
    """
    GET /reports/<report_id>/file/              — stream file inline (for viewing)
    GET /reports/<report_id>/file/?download=1   — stream with attachment header (for download)
    Clinical staff only (doctor, assistant_doctor). assistant_doctor is further scoped to their own patients.
    """
    permission_classes = [IsAuthenticated, ModulePermission("reports")]

    @extend_schema(
        summary="Stream a report file",
        description=(
            "Returns the raw file bytes with the correct Content-Type. "
            "Pass `?download=1` to force a browser download (Content-Disposition: attachment). "
            "Without it the browser will try to render the file inline (PDF, image, etc.)."
        ),
        responses={200: bytes},
    )
    def get(self, request: Request, report_id: uuid.UUID) -> HttpResponse:
        from infrastructure.orm.models.test_order_model import ReportDocumentModel

        try:
            report = ReportDocumentModel.objects.get(id=report_id)
        except ReportDocumentModel.DoesNotExist:
            return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)

        get_audit_service().log(
            action="VIEW",
            resource_type="report",
            resource_id=str(report_id),
            user_id=request.user.id if request.user.is_authenticated else None,
            ip_address=_get_client_ip(request),
        )
        try:
            file_path = report.file.path
        except Exception:
            return Response({"error": "File path unavailable"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not os.path.exists(file_path):
            return Response({"error": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)

        content_type, _ = mimetypes.guess_type(file_path)
        content_type = content_type or "application/octet-stream"

        force_download = request.query_params.get("download", "0") == "1"
        disposition = "attachment" if force_download else "inline"
        safe_name = report.original_filename.replace('"', "")

        response = FileResponse(open(file_path, "rb"), content_type=content_type)
        response["Content-Disposition"] = f'{disposition}; filename="{safe_name}"'
        response["Cache-Control"] = "private, max-age=3600"
        return response


@extend_schema(tags=["reports"])
class ReportDetailView(AuditMixin, APIView):
    """
    DELETE /reports/<report_id>/  — remove a report document (clinical staff only)
    """
    audit_resource_type = "report"
    permission_classes = [IsAuthenticated, ModulePermission("reports")]

    @extend_schema(
        summary="Delete a report",
        description="Permanently delete a report document and its file from storage.",
        responses={204: None},
    )
    def delete(self, request: Request, report_id: uuid.UUID) -> Response:
        from infrastructure.orm.models.test_order_model import ReportDocumentModel

        try:
            report = ReportDocumentModel.objects.get(id=report_id)
        except ReportDocumentModel.DoesNotExist:
            return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            if report.file and os.path.exists(report.file.path):
                os.remove(report.file.path)
        except Exception:
            pass

        report.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
