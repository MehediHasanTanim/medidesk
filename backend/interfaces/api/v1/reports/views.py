import uuid

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from interfaces.api.v1.reports.serializers import UploadReportSerializer, ReportResponseSerializer
from interfaces.permissions import RolePermission


def _report_to_dict(report, request) -> dict:
    return {
        "id": str(report.id),
        "patient_id": str(report.patient_id),
        "consultation_id": str(report.consultation_id) if report.consultation_id else None,
        "category": report.category,
        "file_url": request.build_absolute_uri(report.file.url),
        "original_filename": report.original_filename,
        "uploaded_by_name": report.uploaded_by.full_name if report.uploaded_by else "",
        "uploaded_at": report.uploaded_at.isoformat(),
        "notes": report.notes,
    }


@extend_schema(tags=["reports"])
class ReportUploadView(APIView):
    """
    POST /reports/  — upload a patient report document (multipart/form-data)
    GET  /reports/?patient_id=<uuid>[&consultation_id=<uuid>]  — list reports
    """
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "assistant_doctor"])]
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

        # assistant_doctor: only patients they have appointments with
        if getattr(request.user, "role", None) == "assistant_doctor":
            from infrastructure.repositories.django_patient_repository import DjangoPatientRepository
            if not DjangoPatientRepository().has_appointment_with_doctor(patient_id, request.user.id):
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

        try:
            patient = PatientModel.objects.get(id=patient_id)
        except PatientModel.DoesNotExist:
            return Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

        uploaded_file = data["file"]
        report = ReportDocumentModel.objects.create(
            patient=patient,
            consultation_id=data.get("consultation_id"),
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

        # assistant_doctor: only their patients
        if getattr(request.user, "role", None) == "assistant_doctor":
            from infrastructure.repositories.django_patient_repository import DjangoPatientRepository
            if not DjangoPatientRepository().has_appointment_with_doctor(patient_id, request.user.id):
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

        qs = ReportDocumentModel.objects.filter(patient_id=patient_id).select_related("uploaded_by").order_by("-uploaded_at")

        consultation_id_str = request.query_params.get("consultation_id")
        if consultation_id_str:
            try:
                qs = qs.filter(consultation_id=uuid.UUID(consultation_id_str))
            except ValueError:
                return Response({"error": "Invalid consultation_id"}, status=status.HTTP_400_BAD_REQUEST)

        return Response([_report_to_dict(r, request) for r in qs])
