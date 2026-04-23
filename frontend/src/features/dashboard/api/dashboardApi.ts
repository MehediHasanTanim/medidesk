import apiClient from "@/shared/lib/apiClient";

// Shape returned by GET /api/v1/dashboard/
// Fields present depend on the authenticated user's role.
export interface DashboardStats {
  role: string;
  // doctor / assistant_doctor
  today_appointments?: number;
  pending_rx_approvals?: number;
  today_revenue?: number; // doctor only
  // receptionist / assistant
  queue_total?: number;
  queue_waiting?: number;
  queue_in_progress?: number;
  queue_done?: number;
  pending_invoices?: number;
  today_collected?: number;
  // admin / super_admin — overlaps with doctor fields + queue_waiting
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get<DashboardStats>("/dashboard/");
  return res.data;
}
