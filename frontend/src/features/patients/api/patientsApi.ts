import apiClient from "@/shared/lib/apiClient";

export interface Patient {
  id: string;
  patient_id: string;
  full_name: string;
  phone: string;
  gender: "M" | "F" | "O";
  address: string;
  date_of_birth: string | null;
  age_years: number | null;
  age: number | null;
  email: string | null;
  national_id: string | null;
  allergies: string[];
  chronic_diseases: string[];
  family_history: string;
}

export interface PatientSearchResponse {
  count: number;
  limit: number;
  offset: number;
  results: Patient[];
}

export interface RegisterPatientPayload {
  full_name: string;
  phone: string;
  gender: "M" | "F" | "O";
  address: string;
  date_of_birth?: string | null;
  age_years?: number | null;
  email?: string | null;
  national_id?: string | null;
  allergies?: string[];
  chronic_diseases?: string[];
  family_history?: string;
}

export interface UpdatePatientPayload {
  full_name?: string;
  phone?: string;
  gender?: "M" | "F" | "O";
  address?: string;
  date_of_birth?: string | null;
  age_years?: number | null;
  email?: string | null;
  national_id?: string | null;
  allergies?: string[];
  chronic_diseases?: string[];
  family_history?: string;
}

export const patientsApi = {
  search: (params: { q?: string; limit?: number; offset?: number } = {}) =>
    apiClient
      .get<PatientSearchResponse>("/patients/search/", { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Patient>(`/patients/${id}/`).then((r) => r.data),

  register: (payload: RegisterPatientPayload) =>
    apiClient.post<Patient>("/patients/", payload).then((r) => r.data),

  update: (id: string, payload: UpdatePatientPayload) =>
    apiClient.patch<Patient>(`/patients/${id}/`, payload).then((r) => r.data),
};
