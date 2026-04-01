from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from interfaces.api.v1.auth.views import CustomTokenObtainPairView, MeView, ChangePasswordView
from interfaces.api.v1.patients.views import PatientRegistrationView, PatientDetailView, PatientSearchView
from interfaces.api.v1.appointments.views import BookAppointmentView, QueueView, AppointmentStatusView
from interfaces.api.v1.consultations.views import StartConsultationView, CompleteConsultationView
from interfaces.api.v1.medicines.views import MedicineSearchView
from interfaces.api.v1.prescriptions.views import PrescriptionView, PrescriptionByConsultationView
from interfaces.api.v1.billing.views import InvoiceView, PaymentView, InvoiceDetailView
from interfaces.api.v1.users.views import UserListView, UserDetailView
from interfaces.api.v1.chambers.views import ChamberListView, ChamberDetailView

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("auth/me/", MeView.as_view(), name="auth_me"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),

    # ── Users (admin) ─────────────────────────────────────────────────────────
    path("users/", UserListView.as_view(), name="user_list"),
    path("users/<uuid:user_id>/", UserDetailView.as_view(), name="user_detail"),

    # ── Chambers ─────────────────────────────────────────────────────────────
    path("chambers/", ChamberListView.as_view(), name="chamber_list"),
    path("chambers/<uuid:chamber_id>/", ChamberDetailView.as_view(), name="chamber_detail"),

    # ── Patients ──────────────────────────────────────────────────────────────
    path("patients/", PatientRegistrationView.as_view(), name="patient_register"),
    path("patients/search/", PatientSearchView.as_view(), name="patient_search"),
    path("patients/<uuid:patient_id>/", PatientDetailView.as_view(), name="patient_detail"),

    # ── Appointments ──────────────────────────────────────────────────────────
    path("appointments/", BookAppointmentView.as_view(), name="book_appointment"),
    path("appointments/queue/", QueueView.as_view(), name="queue"),
    path("appointments/<uuid:appointment_id>/status/", AppointmentStatusView.as_view(), name="appointment_status"),

    # ── Consultations ─────────────────────────────────────────────────────────
    path("consultations/", StartConsultationView.as_view(), name="start_consultation"),
    path("consultations/<uuid:consultation_id>/complete/", CompleteConsultationView.as_view(), name="complete_consultation"),

    # ── Prescriptions ─────────────────────────────────────────────────────────
    path("prescriptions/", PrescriptionView.as_view(), name="create_prescription"),
    path("prescriptions/consultation/<uuid:consultation_id>/", PrescriptionByConsultationView.as_view(), name="prescription_by_consultation"),

    # ── Billing ───────────────────────────────────────────────────────────────
    path("invoices/", InvoiceView.as_view(), name="create_invoice"),
    path("invoices/<uuid:invoice_id>/", InvoiceDetailView.as_view(), name="invoice_detail"),
    path("payments/", PaymentView.as_view(), name="record_payment"),

    # ── Medicines ─────────────────────────────────────────────────────────────
    path("medicines/search/", MedicineSearchView.as_view(), name="medicine_search"),
]
