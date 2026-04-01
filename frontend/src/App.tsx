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
        <Route path="/patients" element={<PrivateRoute><PatientsPage /></PrivateRoute>} />
        <Route path="/appointments" element={<PrivateRoute><AppointmentsPage /></PrivateRoute>} />
        <Route path="/queue" element={<PrivateRoute><QueuePage /></PrivateRoute>} />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
