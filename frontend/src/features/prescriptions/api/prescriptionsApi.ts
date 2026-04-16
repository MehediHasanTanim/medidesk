import apiClient from "@/shared/lib/apiClient";

// ── Request types ─────────────────────────────────────────────────────────────

export interface PrescriptionItemPayload {
  medicine_id: string;
  medicine_name: string;
  morning: string;
  afternoon: string;
  evening: string;
  duration_days: number;
  route?: string;
  instructions?: string;
}

export interface CreatePrescriptionPayload {
  consultation_id: string;
  patient_id: string;
  items: PrescriptionItemPayload[];
  follow_up_date?: string; // YYYY-MM-DD
}

export interface UpdatePrescriptionPayload {
  items: PrescriptionItemPayload[];
  follow_up_date?: string | null;
}

// ── Response types ─────────────────────────────────────────────────────────────

export type PrescriptionStatus = "draft" | "active" | "approved";

/** Returned by POST /prescriptions/ */
export interface CreatePrescriptionResponse {
  prescription_id: string;
  status: PrescriptionStatus;
  item_count: number;
  follow_up_date: string | null;
}

/** Full structured item — returned by GET endpoints */
export interface PrescriptionItemDetail {
  medicine_id: string;
  medicine_name: string;
  morning: string;
  afternoon: string;
  evening: string;
  duration_days: number;
  dosage_display: string; // e.g. "1+0+1 × 7 days"
  route: string;
  instructions: string;
}

export interface PrescriptionDetail {
  prescription_id: string;
  consultation_id: string;
  patient_id: string;
  prescribed_by_id: string;
  approved_by_id: string | null;
  status: PrescriptionStatus;
  follow_up_date: string | null;
  created_at: string | null;
  items: PrescriptionItemDetail[];
}

export interface PendingPrescription {
  prescription_id: string;
  consultation_id: string;
  patient_id: string;
  patient_name: string;
  prescribed_by_id: string;
  prescribed_by_name: string;
  status: "draft";
  follow_up_date: string | null;
  created_at: string | null;
  item_count: number;
}

// ── API client ─────────────────────────────────────────────────────────────────

export const prescriptionsApi = {
  /** POST /prescriptions/ — create a prescription for a consultation. */
  create: (payload: CreatePrescriptionPayload) =>
    apiClient
      .post<CreatePrescriptionResponse>("/prescriptions/", payload)
      .then((r) => r.data),

  /** GET /prescriptions/<id>/ — retrieve by prescription ID. */
  get: (prescriptionId: string) =>
    apiClient
      .get<PrescriptionDetail>(`/prescriptions/${prescriptionId}/`)
      .then((r) => r.data),

  /** GET /prescriptions/consultation/<id>/ — fetch prescription for a consultation. */
  getByConsultation: (consultationId: string) =>
    apiClient
      .get<PrescriptionDetail>(`/prescriptions/consultation/${consultationId}/`)
      .then((r) => r.data),

  /** GET /prescriptions/pending/ — list all draft prescriptions (doctor only). */
  listPending: () =>
    apiClient
      .get<PendingPrescription[]>("/prescriptions/pending/")
      .then((r) => r.data),

  /** PATCH /prescriptions/<id>/ — replace items on a DRAFT prescription (doctor only). */
  update: (prescriptionId: string, payload: UpdatePrescriptionPayload) =>
    apiClient
      .patch<PrescriptionDetail>(`/prescriptions/${prescriptionId}/`, payload)
      .then((r) => r.data),

  /** POST /prescriptions/<id>/approve/ — approve a draft prescription (doctor only). */
  approve: (prescriptionId: string) =>
    apiClient
      .post<{ prescription_id: string; status: string; approved_by_id: string }>(
        `/prescriptions/${prescriptionId}/approve/`,
        {}
      )
      .then((r) => r.data),
};
