import apiClient from "@/shared/lib/apiClient";

export type ReportCategory = "blood_test" | "imaging" | "biopsy" | "other";

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  blood_test: "Blood Test",
  imaging: "Imaging",
  biopsy: "Biopsy",
  other: "Other",
};

export const REPORT_CATEGORY_ICONS: Record<ReportCategory, string> = {
  blood_test: "🩸",
  imaging: "🔬",
  biopsy: "🧬",
  other: "📄",
};

export interface ReportResponse {
  id: string;
  patient_id: string;
  consultation_id: string | null;
  test_order_id: string | null;
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
  test_order_id?: string;
  notes?: string;
}

export interface ListReportsParams {
  patient_id: string;
  consultation_id?: string;
  test_order_id?: string;
  category?: ReportCategory;
}

export const reportsApi = {
  upload: (payload: UploadReportPayload) => {
    const form = new FormData();
    form.append("patient_id", payload.patient_id);
    form.append("file", payload.file);
    form.append("category", payload.category);
    if (payload.consultation_id) form.append("consultation_id", payload.consultation_id);
    if (payload.test_order_id) form.append("test_order_id", payload.test_order_id);
    if (payload.notes) form.append("notes", payload.notes);
    return apiClient
      .post<ReportResponse>("/reports/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  list: (params: ListReportsParams) =>
    apiClient
      .get<ReportResponse[]>("/reports/", { params })
      .then((r) => r.data),

  delete: (reportId: string) =>
    apiClient.delete(`/reports/${reportId}/`),
};

export async function viewReport(reportId: string) {
  const win = window.open("about:blank", "_blank");
  if (!win) { alert("Popup blocked — please allow popups for this site."); return; }
  try {
    const res = await apiClient.get(`/reports/${reportId}/file/`, { responseType: "blob" });
    const blob = new Blob([res.data], { type: res.headers["content-type"] ?? "application/octet-stream" });
    win.location.href = URL.createObjectURL(blob);
  } catch {
    win.close();
    alert("Failed to open the report. Please try again.");
  }
}

export async function downloadReport(reportId: string, filename: string) {
  try {
    const res = await apiClient.get(`/reports/${reportId}/file/?download=1`, { responseType: "blob" });
    const blob = new Blob([res.data], { type: res.headers["content-type"] ?? "application/octet-stream" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    alert("Failed to download the report. Please try again.");
  }
}
