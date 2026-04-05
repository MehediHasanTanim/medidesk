import apiClient from "@/shared/lib/apiClient";
import type { UserRecord } from "@/shared/types/auth";

export interface CreateUserPayload {
  username: string;
  full_name: string;
  email: string;
  role: string;
  password: string;
  chamber_ids?: string[];
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  chamber_ids?: string[];
}

export interface DoctorOption {
  id: string;
  full_name: string;
  role: string;
}

export const usersApi = {
  doctors: () =>
    apiClient.get<DoctorOption[]>("/users/doctors/").then((r) => r.data),

  list: (isActive?: boolean) =>
    apiClient
      .get<UserRecord[]>("/users/", { params: isActive !== undefined ? { is_active: isActive } : {} })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<UserRecord>(`/users/${id}/`).then((r) => r.data),

  create: (payload: CreateUserPayload) =>
    apiClient.post<UserRecord>("/users/", payload).then((r) => r.data),

  update: (id: string, payload: UpdateUserPayload) =>
    apiClient.patch<UserRecord>(`/users/${id}/`, payload).then((r) => r.data),

  deactivate: (id: string) =>
    apiClient.delete(`/users/${id}/`),
};
