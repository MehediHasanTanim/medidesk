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

export interface UserListParams {
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface UserListResponse {
  count: number;
  total_pages: number;
  page: number;
  page_size: number;
  results: UserRecord[];
}

export const usersApi = {
  doctors: () =>
    apiClient.get<DoctorOption[]>("/users/doctors/").then((r) => r.data),

  list: (params: UserListParams = {}) =>
    apiClient
      .get<UserListResponse>("/users/", {
        params: {
          ...(params.is_active !== undefined ? { is_active: params.is_active } : {}),
          ...(params.search ? { search: params.search } : {}),
          ...(params.page !== undefined ? { page: params.page } : {}),
          ...(params.page_size !== undefined ? { page_size: params.page_size } : {}),
          ...(params.ordering ? { ordering: params.ordering } : {}),
        },
      })
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
