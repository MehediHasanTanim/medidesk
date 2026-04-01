import apiClient from "@/shared/lib/apiClient";
import type { Chamber } from "@/shared/types/auth";

export interface ChamberPayload {
  name: string;
  address: string;
  phone: string;
}

export interface UpdateChamberPayload {
  name?: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
}

export const chambersApi = {
  list: (activeOnly = true) =>
    apiClient
      .get<Chamber[]>("/chambers/", { params: { active_only: activeOnly } })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Chamber>(`/chambers/${id}/`).then((r) => r.data),

  create: (payload: ChamberPayload) =>
    apiClient.post<Chamber>("/chambers/", payload).then((r) => r.data),

  update: (id: string, payload: UpdateChamberPayload) =>
    apiClient.patch<Chamber>(`/chambers/${id}/`, payload).then((r) => r.data),
};
