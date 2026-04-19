import apiClient from "@/shared/lib/apiClient";

// ── Payload types ─────────────────────────────────────────────────────────────

export interface StartConsultationPayload {
  appointment_id: string;
  patient_id: string;
  chief_complaints: string;
}

export interface UpdateConsultationPayload {
  chief_complaints?: string;
  clinical_findings?: string;
  diagnosis?: string;
  notes?: string;
}

export interface VitalsPayload {
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  pulse?: number | null;
  temperature?: number | null; // Celsius
  weight?: number | null;      // kg
  height?: number | null;      // cm
  spo2?: number | null;        // %
}

export interface CompleteConsultationPayload extends VitalsPayload {
  diagnosis: string;
  clinical_findings?: string;
  notes?: string;
}

// ── Response types ────────────────────────────────────────────────────────────

export interface VitalsData {
  bp_systolic: number | null;
  bp_diastolic: number | null;
  bp_display: string | null;
  pulse: number | null;
  temperature: string | null;
  weight: string | null;
  height: string | null;
  spo2: number | null;
  bmi: string | null;
}

export interface VitalsResponse extends VitalsData {
  consultation_id: string;
}

export interface Consultation {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  /** The attending physician from the appointment (may differ from doctor_id when an assistant started the consultation). */
  appointment_doctor_id: string;
  chief_complaints: string;
  clinical_findings: string;
  diagnosis: string;
  notes: string;
  is_draft: boolean;
  created_at: string | null;
  completed_at: string | null;
  vitals: VitalsData | null;
}

export interface StartConsultationResponse {
  consultation_id: string;
  status: string;
}

// ── API client ────────────────────────────────────────────────────────────────

export const consultationsApi = {
  /** Start a new consultation for an in-queue appointment. */
  start: (payload: StartConsultationPayload) =>
    apiClient
      .post<StartConsultationResponse>("/consultations/", payload)
      .then((r) => r.data),

  /** Retrieve a single consultation by its ID. */
  get: (consultationId: string) =>
    apiClient
      .get<Consultation>(`/consultations/${consultationId}/`)
      .then((r) => r.data),

  /** Fetch the consultation linked to a specific appointment. Returns null if none. */
  getByAppointment: (appointmentId: string) =>
    apiClient
      .get<Consultation[]>(`/consultations/?appointment_id=${appointmentId}`)
      .then((r) => r.data[0] ?? null),

  /** Fetch all consultations for a patient (newest first). */
  getByPatient: (patientId: string, limit = 20) =>
    apiClient
      .get<Consultation[]>(
        `/consultations/?patient_id=${patientId}&limit=${limit}`
      )
      .then((r) => r.data),

  /** Partially update text fields on a draft consultation. */
  update: (consultationId: string, payload: UpdateConsultationPayload) =>
    apiClient
      .patch<Consultation>(`/consultations/${consultationId}/`, payload)
      .then((r) => r.data),

  /** Record or merge vitals onto an in-progress consultation. */
  updateVitals: (consultationId: string, payload: VitalsPayload) =>
    apiClient
      .patch<VitalsResponse>(`/consultations/${consultationId}/vitals/`, payload)
      .then((r) => r.data),

  /** Finalise the consultation. Diagnosis is required. */
  complete: (consultationId: string, payload: CompleteConsultationPayload) =>
    apiClient
      .post<StartConsultationResponse>(
        `/consultations/${consultationId}/complete/`,
        payload
      )
      .then((r) => r.data),
};
