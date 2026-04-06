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
from interfaces.api.v1.patients.views import PatientRegistrationView, PatientDetailView, PatientSearchView, PatientHistoryView
from interfaces.api.v1.appointments.views import BookAppointmentView, QueueView, AppointmentDetailView, AppointmentStatusView, CheckInView
from interfaces.api.v1.consultations.views import StartConsultationView, CompleteConsultationView, UpdateVitalsView
from interfaces.api.v1.medicines.views import MedicineSearchView
from interfaces.api.v1.reports.views import ReportUploadView
from interfaces.api.v1.prescriptions.views import (
    PrescriptionView,
    PrescriptionByConsultationView,
    ApprovePrescriptionView,
    PendingPrescriptionsView,
)
from interfaces.api.v1.billing.views import InvoiceView, PaymentView, InvoiceDetailView
from interfaces.api.v1.users.views import UserListView, UserDetailView, DoctorsListView
from interfaces.api.v1.chambers.views import ChamberListView, ChamberDetailView

urlpatterns = [
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

    # ── Appointments ──────────────────────────────────────────────────────────
    path("appointments/", BookAppointmentView.as_view(), name="book_appointment"),
    path("appointments/queue/", QueueView.as_view(), name="queue"),
    path("appointments/<uuid:appointment_id>/", AppointmentDetailView.as_view(), name="appointment_detail"),
    path("appointments/<uuid:appointment_id>/check-in/", CheckInView.as_view(), name="appointment_check_in"),
    path("appointments/<uuid:appointment_id>/status/", AppointmentStatusView.as_view(), name="appointment_status"),

    # ── Consultations ─────────────────────────────────────────────────────────
    path("consultations/", StartConsultationView.as_view(), name="start_consultation"),
    path("consultations/<uuid:consultation_id>/complete/", CompleteConsultationView.as_view(), name="complete_consultation"),
    path("consultations/<uuid:consultation_id>/vitals/", UpdateVitalsView.as_view(), name="update_vitals"),

    # ── Prescriptions ─────────────────────────────────────────────────────────
    path("prescriptions/", PrescriptionView.as_view(), name="create_prescription"),
    path("prescriptions/pending/", PendingPrescriptionsView.as_view(), name="pending_prescriptions"),
    path("prescriptions/<uuid:prescription_id>/approve/", ApprovePrescriptionView.as_view(), name="approve_prescription"),
    path("prescriptions/consultation/<uuid:consultation_id>/", PrescriptionByConsultationView.as_view(), name="prescription_by_consultation"),

    # ── Billing ───────────────────────────────────────────────────────────────
    path("invoices/", InvoiceView.as_view(), name="create_invoice"),
    path("invoices/<uuid:invoice_id>/", InvoiceDetailView.as_view(), name="invoice_detail"),
    path("payments/", PaymentView.as_view(), name="record_payment"),

    # ── Reports ───────────────────────────────────────────────────────────────
    path("reports/", ReportUploadView.as_view(), name="reports"),

    # ── Medicines ─────────────────────────────────────────────────────────────
    path("medicines/search/", MedicineSearchView.as_view(), name="medicine_search"),
]
