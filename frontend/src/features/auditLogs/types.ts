export interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "LOGIN" | "LOGOUT";
  resource_type: string;
  resource_id: string;
  payload: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
}

export interface AuditLogListResponse {
  results: AuditLog[];
  count: number;
  page: number;
  page_size: number;
}

export interface AuditLogFilters {
  user_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}
