import apiClient from "@/shared/lib/apiClient";

// ── Speciality ─────────────────────────────────────────────────────────────

export interface Speciality {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  doctor_count: number;
}

export interface CreateSpecialityPayload {
  name: string;
  description?: string;
}

export interface UpdateSpecialityPayload {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// ── Doctor Profile ─────────────────────────────────────────────────────────

export interface DoctorProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  role: "doctor" | "assistant_doctor";
  is_active: boolean;
  speciality_id: string;
  speciality_name: string;
  qualifications: string;
  bio: string;
  consultation_fee: number | null;
  experience_years: number | null;
  is_available: boolean;
  visit_days: string[];
  visit_time_start: string | null; // "HH:MM"
  visit_time_end: string | null;   // "HH:MM"
  chamber_ids: string[];
}

export interface CreateDoctorPayload {
  username: string;
  password: string;
  full_name: string;
  email: string;
  role: "doctor" | "assistant_doctor";
  speciality_id: string;
  qualifications: string;
  bio?: string;
  consultation_fee?: number | null;
  experience_years?: number | null;
  is_available?: boolean;
  visit_days?: string[];
  visit_time_start?: string | null;
  visit_time_end?: string | null;
  chamber_ids?: string[];
}

export interface UpdateDoctorPayload {
  full_name?: string;
  email?: string;
  role?: "doctor" | "assistant_doctor";
  is_active?: boolean;
  speciality_id?: string;
  qualifications?: string;
  bio?: string;
  consultation_fee?: number | null;
  experience_years?: number | null;
  is_available?: boolean;
  visit_days?: string[];
  visit_time_start?: string | null;
  visit_time_end?: string | null;
  chamber_ids?: string[];
}

export interface ListDoctorParams {
  speciality_id?: string;
  is_available?: boolean;
  search?: string;
  user_id?: string;
}

// ── API ────────────────────────────────────────────────────────────────────

export const specialitiesApi = {
  list: (active_only = true) =>
    apiClient
      .get<Speciality[]>("/specialities/", { params: { active_only } })
      .then((r) => r.data),

  create: (payload: CreateSpecialityPayload) =>
    apiClient.post<Speciality>("/specialities/", payload).then((r) => r.data),

  update: (id: string, payload: UpdateSpecialityPayload) =>
    apiClient
      .patch<Speciality>(`/specialities/${id}/`, payload)
      .then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/specialities/${id}/`),
};

export const doctorProfilesApi = {
  list: (params: ListDoctorParams = {}) =>
    apiClient
      .get<DoctorProfile[]>("/doctors/profiles/", { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<DoctorProfile>(`/doctors/profiles/${id}/`).then((r) => r.data),

  /** Fetch the doctor profile for a given user UUID (returns null if not found). */
  getByUserId: (userId: string) =>
    apiClient
      .get<DoctorProfile[]>("/doctors/profiles/", { params: { user_id: userId } })
      .then((r) => r.data[0] ?? null),

  create: (payload: CreateDoctorPayload) =>
    apiClient
      .post<DoctorProfile>("/doctors/profiles/", payload)
      .then((r) => r.data),

  update: (id: string, payload: UpdateDoctorPayload) =>
    apiClient
      .patch<DoctorProfile>(`/doctors/profiles/${id}/`, payload)
      .then((r) => r.data),
};
