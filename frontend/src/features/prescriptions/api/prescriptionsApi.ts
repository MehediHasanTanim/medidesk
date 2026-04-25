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

  /** GET /prescriptions/<id>/pdf/ — stream PDF bytes; returns a Blob URL for download/print. */
  getPdfUrl: (prescriptionId: string, download = false): string => {
    const base = apiClient.defaults.baseURL ?? "";
    const token = localStorage.getItem("access_token") ?? "";
    const dl = download ? "&download=1" : "";
    // Returns a URL the caller can open in a new tab; JWT auth via query param not supported
    // here — we use the Blob approach instead (see downloadPdf).
    return `${base}/prescriptions/${prescriptionId}/pdf/?token=${token}${dl}`;
  },

  /** Download the prescription PDF as a Blob and trigger browser save/print. */
  downloadPdf: async (prescriptionId: string, download = false): Promise<void> => {
    const resp = await apiClient.get(`/prescriptions/${prescriptionId}/pdf/`, {
      responseType: "blob",
      params: download ? { download: 1 } : {},
    });
    const blob = new Blob([resp.data as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    if (download) {
      a.download = `prescription-${prescriptionId.slice(0, 8)}.pdf`;
    } else {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /** POST /prescriptions/<id>/send/ — dispatch via WhatsApp / email / all. */
  send: (
    prescriptionId: string,
    channels: "all" | "whatsapp" | "email" = "all"
  ) =>
    apiClient
      .post<{ prescription_id: string; channels: string; success: boolean; pdf_size_bytes: number }>(
        `/prescriptions/${prescriptionId}/send/`,
        { channels }
      )
      .then((r) => r.data),
};
