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
  patient_name: string;
  patient_phone: string;
  scheduled_at: string;
  appointment_type: string;
  status: string;
  token_number: number | null;
}

export interface QueueItem {
  id: string;
  token_number: number | null;
  patient_id: string;
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

export const appointmentsApi = {
  book: (payload: BookAppointmentPayload) =>
    apiClient.post<AppointmentResponse>("/appointments/", payload).then((r) => r.data),

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
