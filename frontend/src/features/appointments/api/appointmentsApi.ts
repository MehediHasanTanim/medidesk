import apiClient from "@/shared/lib/apiClient";

export interface BookAppointmentPayload {
  patient_id: string;
  doctor_id?: string; // required for receptionist/assistant; optional for doctors (defaults to self)
  scheduled_at: string; // ISO datetime
  appointment_type: "new" | "follow_up" | "walk_in";
  chamber_id?: string;
  notes?: string;
}

export interface AppointmentResponse {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  doctor_id: string;
  doctor_name: string;
  chamber_id: string | null;
  scheduled_at: string;
  appointment_type: string;
  status: string;
  token_number: number | null;
  notes: string;
}

/** Shape returned by GET /appointments/ results array */
export interface AppointmentListItem {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  doctor_id: string;
  doctor_name: string;
  chamber_id: string | null;
  scheduled_at: string;
  appointment_type: string;
  status: string;
  token_number: number | null;
  notes: string;
}

export interface AppointmentListResponse {
  count: number;
  limit: number;
  offset: number;
  results: AppointmentListItem[];
}

export interface ListAppointmentsParams {
  date?: string;
  patient_id?: string;
  doctor_id?: string;
  status?: AppointmentStatus;
  limit?: number;
  offset?: number;
}

export interface QueueItem {
  id: string;
  token_number: number | null;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  scheduled_at: string;
  appointment_type: string;
  status: string;
  notes: string;
}

export interface QueueResponse {
  date: string;
  total: number;
  queue: QueueItem[];
}

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_queue"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface UpdateAppointmentPayload {
  doctor_id?: string;
  scheduled_at?: string; // ISO datetime
  appointment_type?: "new" | "follow_up" | "walk_in";
  chamber_id?: string | null;
  notes?: string;
}

export const appointmentsApi = {
  /** GET /appointments/ — paginated list with optional filters */
  list: (params: ListAppointmentsParams = {}) =>
    apiClient
      .get<AppointmentListResponse>("/appointments/", { params })
      .then((r) => r.data),

  /** GET /appointments/{id}/ — single appointment details */
  get: (id: string) =>
    apiClient.get<AppointmentListItem>(`/appointments/${id}/`).then((r) => r.data),

  book: (payload: BookAppointmentPayload) =>
    apiClient.post<AppointmentResponse>("/appointments/", payload).then((r) => r.data),

  /** PATCH /appointments/{id}/ — edit fields (only when scheduled/confirmed) */
  update: (id: string, payload: UpdateAppointmentPayload) =>
    apiClient
      .patch<AppointmentListItem>(`/appointments/${id}/`, payload)
      .then((r) => r.data),

  getQueue: (date?: string, chamberId?: string) =>
    apiClient
      .get<QueueResponse>("/appointments/queue/", {
        params: {
          ...(date ? { date } : {}),
          ...(chamberId ? { chamber_id: chamberId } : {}),
        },
      })
      .then((r) => r.data),

  /** Check in a patient: assigns next token and sets status to in_queue */
  checkIn: (appointmentId: string) =>
    apiClient
      .post<{ id: string; status: string; token_number: number }>(
        `/appointments/${appointmentId}/check-in/`,
        {}
      )
      .then((r) => r.data),

  /** Generic status transitions: confirm, cancel, no_show, in_progress, completed */
  updateStatus: (appointmentId: string, status: Exclude<AppointmentStatus, "in_queue">) =>
    apiClient
      .patch<{ id: string; status: string }>(`/appointments/${appointmentId}/status/`, { status })
      .then((r) => r.data),
};
