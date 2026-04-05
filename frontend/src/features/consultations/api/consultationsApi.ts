import apiClient from "@/shared/lib/apiClient";

export interface StartConsultationPayload {
  appointment_id: string;
  patient_id: string;
  chief_complaints: string;
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

export interface VitalsResponse {
  consultation_id: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  bp_display: string | null;
  pulse: number | null;
  temperature: number | null;
  weight: number | null;
  height: number | null;
  spo2: number | null;
  bmi: number | null;
}

export interface CompleteConsultationPayload extends VitalsPayload {
  diagnosis: string;
  clinical_findings?: string;
  notes?: string;
}

export const consultationsApi = {
  start: (payload: StartConsultationPayload) =>
    apiClient.post("/consultations/", payload).then((r) => r.data),

  updateVitals: (consultationId: string, payload: VitalsPayload) =>
    apiClient
      .patch<VitalsResponse>(`/consultations/${consultationId}/vitals/`, payload)
      .then((r) => r.data),

  complete: (consultationId: string, payload: CompleteConsultationPayload) =>
    apiClient
      .post(`/consultations/${consultationId}/complete/`, payload)
      .then((r) => r.data),
};
