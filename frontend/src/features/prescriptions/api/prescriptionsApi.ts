import apiClient from "@/shared/lib/apiClient";

export interface PrescriptionItem {
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
  items: PrescriptionItem[];
  follow_up_date?: string; // YYYY-MM-DD
}

export type PrescriptionStatus = "draft" | "active" | "approved";

export interface PrescriptionResponse {
  prescription_id: string;
  status: PrescriptionStatus;
  item_count: number;
  follow_up_date: string | null;
}

export interface PrescriptionDetail {
  prescription_id: string;
  consultation_id: string;
  patient_id: string;
  status: PrescriptionStatus;
  approved_by_id: string | null;
  follow_up_date: string | null;
  items: Array<{
    medicine_id: string;
    medicine_name: string;
    dosage: string;
    route: string;
    instructions: string;
  }>;
}

export interface PendingPrescription {
  prescription_id: string;
  consultation_id: string;
  patient_id: string;
  prescribed_by_id: string;
  status: "draft";
  follow_up_date: string | null;
  created_at: string | null;
  item_count: number;
}

export const prescriptionsApi = {
  create: (payload: CreatePrescriptionPayload) =>
    apiClient.post<PrescriptionResponse>("/prescriptions/", payload).then((r) => r.data),

  getByConsultation: (consultationId: string) =>
    apiClient
      .get<PrescriptionDetail>(`/prescriptions/consultation/${consultationId}/`)
      .then((r) => r.data),

  // Doctor only — list all draft prescriptions awaiting approval
  listPending: () =>
    apiClient.get<PendingPrescription[]>("/prescriptions/pending/").then((r) => r.data),

  // Doctor only — approve a draft prescription from an assistant_doctor
  approve: (prescriptionId: string) =>
    apiClient
      .post<{ prescription_id: string; status: string; approved_by_id: string }>(
        `/prescriptions/${prescriptionId}/approve/`,
        {}
      )
      .then((r) => r.data),
};
