import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import RoleGuard from "@/shared/components/RoleGuard";

import LoginPage from "@/features/auth/pages/LoginPage";
import ProfilePage from "@/features/auth/pages/ProfilePage";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import PatientsPage from "@/features/patients/pages/PatientsPage";
import AppointmentsPage from "@/features/appointments/pages/AppointmentsPage";
import QueuePage from "@/features/appointments/pages/QueuePage";
import UsersPage from "@/features/users/pages/UsersPage";
import ChambersPage from "@/features/chambers/pages/ChambersPage";
import BillingPage from "@/features/billing/pages/BillingPage";
import IncomePage from "@/features/billing/pages/IncomePage";
import PatientHistoryPage from "@/features/patients/pages/PatientHistoryPage";
import PrescriptionsPage from "@/features/prescriptions/pages/PrescriptionsPage";
import DoctorsPage from "@/features/doctors/pages/DoctorsPage";
import ConsultationPage from "@/features/consultations/pages/ConsultationPage";
import MedicinesPage from "@/features/medicines/pages/MedicinesPage";
import TestOrdersPage from "@/features/testOrders/pages/TestOrdersPage";
import AuditLogsPage from "@/features/auditLogs/pages/AuditLogsPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Private — all authenticated users */}
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        {/* Clinical & front-desk — doctors, assistant doctors, receptionists, assistants (clerical), trainees (read-only) */}
        <Route
          path="/patients"
          element={
            <PrivateRoute>
              <RoleGuard roles={["doctor", "assistant_doctor", "receptionist", "assistant", "trainee"]}>
                <PatientsPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/patients/:patientId/history"
          element={
            <PrivateRoute>
              <RoleGuard roles={["doctor", "assistant_doctor", "trainee"]}>
                <PatientHistoryPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <PrivateRoute>
              <RoleGuard roles={["doctor", "assistant_doctor", "receptionist", "assistant", "trainee"]}>
                <AppointmentsPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/queue"
          element={
            <PrivateRoute>
              <RoleGuard roles={["doctor", "assistant_doctor", "receptionist", "assistant", "trainee"]}>
                <QueuePage />
              </RoleGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/consultations/:appointmentId"
          element={
            <PrivateRoute>
              <RoleGuard roles={["doctor", "assistant_doctor", "receptionist", "assistant", "trainee", "admin", "super_admin"]}>
                <ConsultationPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />
        {/* Billing — receptionist & assistant handle invoices; admins can view/manage */}
        <Route
          path="/billing"
          element={
            <PrivateRoute>
              <RoleGuard roles={["receptionist", "assistant", "admin", "super_admin"]}>
                <BillingPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/income"
          element={
            <PrivateRoute>
              <RoleGuard roles={["receptionist", "admin", "super_admin"]}>
                <IncomePage />
              </RoleGuard>
            </PrivateRoute>
          }
        />

        {/* Clinical — doctors see approval queue; assistant doctors see their own submissions */}
        <Route
          path="/prescriptions"
          element={
            <PrivateRoute>
              <RoleGuard roles={["doctor", "assistant_doctor"]}>
                <PrescriptionsPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />

        {/* Test-order approvals — doctors only */}
        <Route
          path="/test-orders"
          element={
            <PrivateRoute>
              <RoleGuard roles={["doctor"]}>
                <TestOrdersPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />

        {/* Medicines — doctors + trainees (read-only) + admins */}
        <Route
          path="/medicines"
          element={
            <PrivateRoute>
              <RoleGuard roles={["doctor", "assistant_doctor", "trainee", "super_admin", "admin"]}>
                <MedicinesPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />

        {/* Admin-only */}
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <RoleGuard roles={["super_admin", "admin"]}>
                <UsersPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/chambers"
          element={
            <PrivateRoute>
              <RoleGuard roles={["super_admin", "admin"]}>
                <ChambersPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/doctors"
          element={
            <PrivateRoute>
              <RoleGuard roles={["super_admin", "admin"]}>
                <DoctorsPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <PrivateRoute>
              <RoleGuard roles={["admin", "super_admin"]}>
                <AuditLogsPage />
              </RoleGuard>
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
