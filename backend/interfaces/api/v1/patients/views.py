import uuid

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.patient_dto import RegisterPatientDTO, UpdatePatientDTO
from application.use_cases.patient.update_patient import UpdatePatientUseCase
from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
from interfaces.api.container import Container
from interfaces.api.v1.patients.serializers import (
    PatientResponseSerializer,
    RegisterPatientSerializer,
    UpdatePatientSerializer,
)
from interfaces.permissions import ModulePermission, RolePermission


class PatientRegistrationView(APIView):
    # patients.create: doctor, receptionist, assistant — NOT assistant_doctor (matrix enforces this).
    permission_classes = [IsAuthenticated, ModulePermission("patients")]

    @extend_schema(
        tags=["patients"],
        summary="Register a new patient",
        description=(
            "Creates a new patient record with an auto-generated MED-XXXXX ID. "
            "Phone numbers are not unique — multiple patients (e.g. siblings) may share the same number."
        ),
        request=RegisterPatientSerializer,
        responses={
            201: PatientResponseSerializer,
            400: OpenApiResponse(description="Validation error"),
        },
    )
    def post(self, request: Request) -> Response:
        serializer = RegisterPatientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dto_data = serializer.validated_data
        if dto_data.get("date_of_birth"):
            dto_data["date_of_birth"] = str(dto_data["date_of_birth"])

        use_case = Container.register_patient()
        try:
            result = use_case.execute(RegisterPatientDTO(**dto_data))
            return Response(PatientResponseSerializer(result.__dict__).data, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_409_CONFLICT)


class PatientSearchView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission("patients")]

    @extend_schema(
        tags=["patients"],
        summary="Search / list patients",
        description=(
            "Returns a paginated list of active patients. "
            "Pass `q` to filter by name, phone, or patient ID."
        ),
        parameters=[
            OpenApiParameter("q", str, description="Search query (name, phone, patient ID)", required=False),
            OpenApiParameter("limit", int, description="Max results to return (default 20, max 100)", required=False),
            OpenApiParameter("offset", int, description="Pagination offset (default 0)", required=False),
        ],
        responses={200: PatientResponseSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        query = request.query_params.get("q", "")
        limit = min(int(request.query_params.get("limit", 20)), 100)
        offset = int(request.query_params.get("offset", 0))

        from django.db.models import Q
        from infrastructure.orm.models.patient_model import PatientModel
        from infrastructure.repositories.django_patient_repository import DjangoPatientRepository
        repo = DjangoPatientRepository()

        patients = repo.search(query, limit=limit, offset=offset) if query else repo.list_all(limit, offset)

        count_qs = PatientModel.objects.filter(is_active=True)
        if query:
            count_qs = count_qs.filter(
                Q(full_name__icontains=query) | Q(phone__icontains=query) | Q(patient_id__icontains=query)
            )

        return Response({
            "count": count_qs.count(),
            "limit": limit,
            "offset": offset,
            "results": [PatientResponseSerializer(p.__dict__).data for p in patients],
        })


class PatientDetailView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission("patients")]

    @extend_schema(
        tags=["patients"],
        summary="Get patient by ID",
        description="Returns full patient demographics and medical background.",
        responses={
            200: PatientResponseSerializer,
            404: OpenApiResponse(description="Patient not found"),
        },
    )
    def get(self, request: Request, patient_id: uuid.UUID) -> Response:
        from infrastructure.repositories.django_patient_repository import DjangoPatientRepository
        repo = DjangoPatientRepository()
        patient = repo.get_by_id(patient_id)
        if not patient:
            return Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(PatientResponseSerializer(patient.__dict__).data)

    @extend_schema(
        tags=["patients"],
        summary="Update patient",
        description="Partially update patient demographics or medical information. All fields are optional. Phone must remain unique if changed.",
        request=UpdatePatientSerializer,
        responses={
            200: PatientResponseSerializer,
            400: OpenApiResponse(description="Validation error"),
            404: OpenApiResponse(description="Patient not found"),
            409: OpenApiResponse(description="Phone already registered to another patient"),
        },
    )
    def patch(self, request: Request, patient_id: uuid.UUID) -> Response:
        serializer = UpdatePatientSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        if data.get("date_of_birth"):
            data["date_of_birth"] = str(data["date_of_birth"])

        dto = UpdatePatientDTO(patient_id=str(patient_id), **data)
        try:
            result = UpdatePatientUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(PatientResponseSerializer(result.__dict__).data)
        except ValueError as exc:
            msg = str(exc)
            status_code = status.HTTP_404_NOT_FOUND if "not found" in msg.lower() else status.HTTP_409_CONFLICT
            return Response({"error": msg}, status=status_code)


@extend_schema(
    tags=["patients"],
    summary="Patient full history",
    description="Returns complete clinical history for a patient: demographics, appointments, consultations (with vitals & prescriptions), and uploaded reports. Accessible to doctor and assistant_doctor.",
)
class PatientHistoryView(APIView):
    # Full clinical history includes consultations, prescriptions, test orders —
    # restricted to clinical staff only; RolePermission narrows beyond patients.view.
    permission_classes = [IsAuthenticated, ModulePermission("patients"), RolePermission(["doctor", "assistant_doctor"])]

    def get(self, request: Request, patient_id: uuid.UUID) -> Response:
        from infrastructure.repositories.django_patient_repository import DjangoPatientRepository
        from infrastructure.repositories.django_appointment_repository import DjangoAppointmentRepository
        from infrastructure.repositories.django_consultation_repository import DjangoConsultationRepository
        from infrastructure.repositories.django_prescription_repository import DjangoPrescriptionRepository
        from infrastructure.orm.models.test_order_model import ReportDocumentModel, TestOrderModel

        patient_repo = DjangoPatientRepository()
        patient = patient_repo.get_by_id(patient_id)
        if not patient:
            return Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

        # Appointments
        appointments = DjangoAppointmentRepository().get_by_patient(patient_id, limit=50)
        appt_list = [
            {
                "id": str(a.id),
                "scheduled_at": a.scheduled_at.isoformat(),
                "appointment_type": a.appointment_type.value,
                "status": a.status.value,
                "token_number": a.token_number,
                "notes": a.notes,
            }
            for a in appointments
        ]

        # Pre-fetch all test orders for this patient keyed by consultation_id
        test_orders_qs = (
            TestOrderModel.objects
            .filter(patient_id=patient_id)
            .select_related("ordered_by")
        )
        test_orders_by_consultation: dict = {}
        for o in test_orders_qs:
            key = str(o.consultation_id)
            test_orders_by_consultation.setdefault(key, []).append({
                "id": str(o.id),
                "test_name": o.test_name,
                "lab_name": o.lab_name or "",
                "notes": o.notes or "",
                "ordered_by_name": o.ordered_by.full_name if o.ordered_by else "",
                "ordered_at": o.ordered_at.isoformat() if o.ordered_at else None,
                "is_completed": o.is_completed,
                "completed_at": o.completed_at.isoformat() if o.completed_at else None,
                "approval_status": o.approval_status,
            })

        # Consultations + prescriptions
        consultations = DjangoConsultationRepository().get_by_patient(patient_id, limit=30)
        consultation_list = []
        prx_repo = DjangoPrescriptionRepository()
        for c in consultations:
            vitals = None
            if c.vitals:
                v = c.vitals
                vitals = {
                    "bp": v.bp_display,
                    "pulse": v.pulse,
                    "temperature": str(v.temperature) if v.temperature else None,
                    "weight": str(v.weight) if v.weight else None,
                    "height": str(v.height) if v.height else None,
                    "spo2": v.spo2,
                    "bmi": str(v.bmi) if v.bmi else None,
                }
            prx = prx_repo.get_by_consultation(c.id)
            prescription = None
            if prx:
                prescription = {
                    "prescription_id": str(prx.id),
                    "status": prx.status.value,
                    "follow_up_date": str(prx.follow_up_date) if prx.follow_up_date else None,
                    "items": [
                        {
                            "medicine_name": item.medicine_name,
                            "dosage": f"{item.dosage.morning}-{item.dosage.afternoon}-{item.dosage.evening}",
                            "duration_days": item.dosage.duration_days,
                            "route": item.route,
                            "instructions": item.dosage.instructions,
                        }
                        for item in prx.items
                    ],
                }
            consultation_list.append({
                "id": str(c.id),
                "appointment_id": str(c.appointment_id),
                "chief_complaints": c.chief_complaints,
                "clinical_findings": c.clinical_findings,
                "diagnosis": c.diagnosis,
                "notes": c.notes,
                "vitals": vitals,
                "is_draft": c.is_draft,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "completed_at": c.completed_at.isoformat() if c.completed_at else None,
                "prescription": prescription,
                "test_orders": test_orders_by_consultation.get(str(c.id), []),
            })

        # Reports
        reports_qs = ReportDocumentModel.objects.filter(patient_id=patient_id).select_related("uploaded_by").order_by("-uploaded_at")[:30]
        report_list = [
            {
                "id": str(r.id),
                "category": r.category,
                "file_url": r.file.url,
                "original_filename": r.original_filename,
                "uploaded_by_name": r.uploaded_by.full_name if r.uploaded_by else "",
                "uploaded_at": r.uploaded_at.isoformat(),
                "notes": r.notes,
            }
            for r in reports_qs
        ]

        # Aggregate all unique non-empty diagnoses across every consultation for
        # this patient (not capped to the 30 displayed), most recent first.
        from infrastructure.orm.models.consultation_model import ConsultationModel
        past_diagnoses = list(
            dict.fromkeys(
                d for d in (
                    ConsultationModel.objects
                    .filter(patient_id=patient_id, is_draft=False)
                    .exclude(diagnosis="")
                    .order_by("-created_at")
                    .values_list("diagnosis", flat=True)
                )
                if d
            )
        )

        # Patient-level notes (not tied to any consultation)
        from infrastructure.orm.models.patient_note_model import PatientNoteModel
        notes_qs = (
            PatientNoteModel.objects
            .filter(patient_id=patient_id)
            .select_related("created_by")
            .order_by("-created_at")[:50]
        )
        note_list = [
            {
                "id": str(n.id),
                "content": n.content,
                "created_by_name": n.created_by.full_name if n.created_by else "",
                "created_by_role": n.created_by.role if n.created_by else "",
                "created_at": n.created_at.isoformat(),
            }
            for n in notes_qs
        ]

        return Response({
            "patient": PatientResponseSerializer(patient.__dict__).data,
            "past_diagnoses": past_diagnoses,
            "appointments": appt_list,
            "consultations": consultation_list,
            "reports": report_list,
            "notes": note_list,
        })


@extend_schema(
    tags=["patients"],
    summary="Create a patient note",
    description=(
        "Adds a free-form staff note to a patient record. "
        "Notes are not tied to any consultation — use them for administrative "
        "observations, reception reminders, or clinical flags."
    ),
)
class PatientNoteCreateView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission("patients")]

    def post(self, request: Request, patient_id: uuid.UUID) -> Response:
        from infrastructure.repositories.django_patient_repository import DjangoPatientRepository
        from infrastructure.orm.models.patient_note_model import PatientNoteModel

        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"error": "Note content is required."}, status=status.HTTP_400_BAD_REQUEST)

        repo = DjangoPatientRepository()
        if not repo.get_by_id(patient_id):
            return Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

        note = PatientNoteModel.objects.create(
            patient_id=patient_id,
            content=content,
            created_by=request.user,
        )
        note.refresh_from_db()  # populate auto fields (created_at)

        return Response(
            {
                "id": str(note.id),
                "content": note.content,
                "created_by_name": note.created_by.full_name if note.created_by else "",
                "created_by_role": note.created_by.role if note.created_by else "",
                "created_at": note.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )
