import apiClient from "@/shared/lib/apiClient";

export type ReportCategory = "blood_test" | "imaging" | "biopsy" | "other";

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  blood_test: "Blood Test",
  imaging: "Imaging",
  biopsy: "Biopsy",
  other: "Other",
};

export interface ReportResponse {
  id: string;
  patient_id: string;
  consultation_id: string | null;
  category: ReportCategory;
  file_url: string;
  original_filename: string;
  uploaded_by_name: string;
  uploaded_at: string;
  notes: string;
}

export interface UploadReportPayload {
  patient_id: string;
  file: File;
  category: ReportCategory;
  consultation_id?: string;
  notes?: string;
}

export const reportsApi = {
  upload: (payload: UploadReportPayload) => {
    const form = new FormData();
    form.append("patient_id", payload.patient_id);
    form.append("file", payload.file);
    form.append("category", payload.category);
    if (payload.consultation_id) form.append("consultation_id", payload.consultation_id);
    if (payload.notes) form.append("notes", payload.notes);
    return apiClient
      .post<ReportResponse>("/reports/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  list: (patientId: string, consultationId?: string) =>
    apiClient
      .get<ReportResponse[]>("/reports/", {
        params: {
          patient_id: patientId,
          ...(consultationId ? { consultation_id: consultationId } : {}),
        },
      })
      .then((r) => r.data),
};
