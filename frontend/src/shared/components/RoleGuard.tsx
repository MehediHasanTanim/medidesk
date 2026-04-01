import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { UserRole } from "@/shared/types/auth";

interface Props {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: string; // redirect path, default "/"
}

/**
 * Renders children only if the current user has one of the allowed roles.
 * Admin bypasses all role checks.
 */
export default function RoleGuard({ roles, children, fallback = "/" }: Props) {
  const canAccess = useAuthStore((s) => s.canAccess);
  if (!canAccess(roles)) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
