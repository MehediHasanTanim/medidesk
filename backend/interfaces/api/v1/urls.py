from django.urls import path
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from interfaces.api.v1.auth.views import CustomTokenObtainPairView, MeView, ChangePasswordView
from interfaces.api.v1.auth.serializers import (
    TokenRefreshRequestSerializer,
    TokenRefreshResponseSerializer,
    TokenBlacklistRequestSerializer,
    MessageSerializer,
)

# Tag simplejwt built-in views under the "auth" group with proper schemas
TokenRefreshView = extend_schema(
    tags=["auth"],
    summary="Refresh access token",
    description="Exchange a valid refresh token for a new access + rotated refresh token.",
    request=TokenRefreshRequestSerializer,
    responses={200: TokenRefreshResponseSerializer},
)(TokenRefreshView)

TokenBlacklistView = extend_schema(
    tags=["auth"],
    summary="Logout",
    description="Blacklist the refresh token, effectively logging the user out.",
    request=TokenBlacklistRequestSerializer,
    responses={200: MessageSerializer},
)(TokenBlacklistView)
from interfaces.api.v1.patients.views import PatientRegistrationView, PatientDetailView, PatientSearchView, PatientHistoryView, PatientNoteCreateView
from interfaces.api.v1.appointments.views import BookAppointmentView, QueueView, QueueSSEView, AppointmentDetailView, AppointmentStatusView, CheckInView, WalkInView
from interfaces.api.v1.doctors.views import (
    SpecialityListView,
    SpecialityDetailView,
    DoctorProfileListView,
    DoctorProfileDetailView,
)
from interfaces.api.v1.consultations.views import (
    ConsultationListView,
    ConsultationDetailView,
    CompleteConsultationView,
    UpdateVitalsView,
)
from interfaces.api.v1.medicines.views import (
    MedicineSearchView,
    GenericMedicineListView,
    GenericMedicineDetailView,
    BrandMedicineListView,
    BrandMedicineDetailView,
    ManufacturerListView,
    ManufacturerDetailView,
)
from interfaces.api.v1.reports.views import ReportUploadView, ReportFileView, ReportDetailView
from interfaces.api.v1.prescriptions.views import (
    PrescriptionView,
    PrescriptionDetailView,
    PrescriptionByConsultationView,
    ApprovePrescriptionView,
    PendingPrescriptionsView,
    PrescriptionPDFView,
    SendPrescriptionView,
)
from interfaces.api.v1.billing.views import InvoiceView, PaymentView, InvoiceDetailView, InvoicePDFView, IncomeReportView
from interfaces.api.v1.test_orders.views import (
    ConsultationTestOrdersView,
    TestOrderDetailView,
    PatientTestOrdersView,
    PendingTestOrdersView,
    MyTestOrdersView,
)
from interfaces.api.v1.users.views import UserListView, UserDetailView, DoctorsListView
from interfaces.api.v1.chambers.views import ChamberListView, ChamberDetailView
from interfaces.api.v1.dashboard.views import DashboardView
from interfaces.api.v1.audit_logs.views import AuditLogListView

urlpatterns = [
    # ── Dashboard ─────────────────────────────────────────────────────────────
    path("dashboard/", DashboardView.as_view(), name="dashboard"),

    # ── Audit logs ────────────────────────────────────────────────────────────
    path("audit-logs/", AuditLogListView.as_view(), name="audit_log_list"),

    # ── Auth ──────────────────────────────────────────────────────────────────
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("auth/me/", MeView.as_view(), name="auth_me"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),

    # ── Users (admin) ─────────────────────────────────────────────────────────
    path("users/doctors/", DoctorsListView.as_view(), name="doctors_list"),
    path("users/", UserListView.as_view(), name="user_list"),
    path("users/<uuid:user_id>/", UserDetailView.as_view(), name="user_detail"),

    # ── Chambers ─────────────────────────────────────────────────────────────
    path("chambers/", ChamberListView.as_view(), name="chamber_list"),
    path("chambers/<uuid:chamber_id>/", ChamberDetailView.as_view(), name="chamber_detail"),

    # ── Patients ──────────────────────────────────────────────────────────────
    path("patients/", PatientRegistrationView.as_view(), name="patient_register"),
    path("patients/search/", PatientSearchView.as_view(), name="patient_search"),
    path("patients/<uuid:patient_id>/", PatientDetailView.as_view(), name="patient_detail"),
    path("patients/<uuid:patient_id>/history/", PatientHistoryView.as_view(), name="patient_history"),
    path("patients/<uuid:patient_id>/notes/", PatientNoteCreateView.as_view(), name="patient_notes"),

    # ── Appointments ──────────────────────────────────────────────────────────
    path("appointments/", BookAppointmentView.as_view(), name="book_appointment"),
    path("appointments/queue/", QueueView.as_view(), name="queue"),
    path("appointments/queue/stream/", QueueSSEView.as_view(), name="queue_sse"),
    path("appointments/walk-in/", WalkInView.as_view(), name="walk_in"),
    path("appointments/<uuid:appointment_id>/", AppointmentDetailView.as_view(), name="appointment_detail"),
    path("appointments/<uuid:appointment_id>/check-in/", CheckInView.as_view(), name="appointment_check_in"),
    path("appointments/<uuid:appointment_id>/status/", AppointmentStatusView.as_view(), name="appointment_status"),

    # ── Consultations ─────────────────────────────────────────────────────────
    path("consultations/", ConsultationListView.as_view(), name="consultation_list"),
    path("consultations/<uuid:consultation_id>/", ConsultationDetailView.as_view(), name="consultation_detail"),
    path("consultations/<uuid:consultation_id>/complete/", CompleteConsultationView.as_view(), name="complete_consultation"),
    path("consultations/<uuid:consultation_id>/vitals/", UpdateVitalsView.as_view(), name="update_vitals"),

    # ── Prescriptions ─────────────────────────────────────────────────────────
    path("prescriptions/", PrescriptionView.as_view(), name="create_prescription"),
    path("prescriptions/<uuid:prescription_id>/", PrescriptionDetailView.as_view(), name="prescription_detail"),
    path("prescriptions/pending/", PendingPrescriptionsView.as_view(), name="pending_prescriptions"),
    path("prescriptions/<uuid:prescription_id>/approve/", ApprovePrescriptionView.as_view(), name="approve_prescription"),
    path("prescriptions/<uuid:prescription_id>/pdf/", PrescriptionPDFView.as_view(), name="prescription_pdf"),
    path("prescriptions/<uuid:prescription_id>/send/", SendPrescriptionView.as_view(), name="send_prescription"),
    path("prescriptions/consultation/<uuid:consultation_id>/", PrescriptionByConsultationView.as_view(), name="prescription_by_consultation"),

    # ── Billing ───────────────────────────────────────────────────────────────
    path("invoices/", InvoiceView.as_view(), name="create_invoice"),
    path("invoices/<uuid:invoice_id>/", InvoiceDetailView.as_view(), name="invoice_detail"),
    path("invoices/<uuid:invoice_id>/pdf/", InvoicePDFView.as_view(), name="invoice_pdf"),
    path("payments/", PaymentView.as_view(), name="record_payment"),
    path("income-report/", IncomeReportView.as_view(), name="income_report"),

    # ── Lab test orders ───────────────────────────────────────────────────────
    path("consultations/<uuid:consultation_id>/test-orders/", ConsultationTestOrdersView.as_view(), name="consultation_test_orders"),
    path("test-orders/mine/", MyTestOrdersView.as_view(), name="my_test_orders"),
    path("test-orders/pending/", PendingTestOrdersView.as_view(), name="pending_test_orders"),
    path("test-orders/", PatientTestOrdersView.as_view(), name="patient_test_orders"),
    path("test-orders/<uuid:order_id>/", TestOrderDetailView.as_view(), name="test_order_detail"),

    # ── Reports ───────────────────────────────────────────────────────────────
    path("reports/", ReportUploadView.as_view(), name="reports"),
    path("reports/<uuid:report_id>/", ReportDetailView.as_view(), name="report_detail"),
    path("reports/<uuid:report_id>/file/", ReportFileView.as_view(), name="report_file"),

    # ── Medicines ─────────────────────────────────────────────────────────────
    path("medicines/search/", MedicineSearchView.as_view(), name="medicine_search"),
    path("medicines/generics/", GenericMedicineListView.as_view(), name="generic_medicine_list"),
    path("medicines/generics/<uuid:generic_id>/", GenericMedicineDetailView.as_view(), name="generic_medicine_detail"),
    path("medicines/brands/", BrandMedicineListView.as_view(), name="brand_medicine_list"),
    path("medicines/brands/<uuid:brand_id>/", BrandMedicineDetailView.as_view(), name="brand_medicine_detail"),
    path("medicines/manufacturers/", ManufacturerListView.as_view(), name="manufacturer_list"),
    path("medicines/manufacturers/<uuid:manufacturer_id>/", ManufacturerDetailView.as_view(), name="manufacturer_detail"),

    # ── Specialities ──────────────────────────────────────────────────────────
    path("specialities/", SpecialityListView.as_view(), name="speciality_list"),
    path("specialities/<uuid:speciality_id>/", SpecialityDetailView.as_view(), name="speciality_detail"),

    # ── Doctor Profiles ───────────────────────────────────────────────────────
    path("doctors/profiles/", DoctorProfileListView.as_view(), name="doctor_profile_list"),
    path("doctors/profiles/<uuid:profile_id>/", DoctorProfileDetailView.as_view(), name="doctor_profile_detail"),
]
