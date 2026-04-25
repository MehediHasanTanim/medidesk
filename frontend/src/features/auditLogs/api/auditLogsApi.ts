import { useQuery } from "@tanstack/react-query";
import apiClient from "@/shared/lib/apiClient";
import type { AuditLogFilters, AuditLogListResponse } from "../types";

export const auditLogsKeys = {
  list: (filters: AuditLogFilters) => ["audit-logs", filters] as const,
};

export const auditLogsApi = {
  list: (filters: AuditLogFilters) =>
    apiClient
      .get<AuditLogListResponse>("/api/v1/audit-logs/", { params: filters })
      .then((r) => r.data),
};

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: auditLogsKeys.list(filters),
    queryFn: () => auditLogsApi.list(filters),
  });
}
