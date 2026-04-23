import apiClient from "@/shared/lib/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface TestOrder {
  id: string;
  consultation_id: string;
  patient_id: string;
  patient_name: string;
  test_name: string;
  lab_name: string;
  notes: string;
  ordered_by_id: string | null;
  ordered_by_name: string;
  ordered_at: string | null;
  is_completed: boolean;
  completed_at: string | null;
  approval_status: ApprovalStatus;
}

export interface CreateTestOrderItem {
  test_name: string;
  lab_name?: string;
  notes?: string;
}

export interface UpdateTestOrderPayload {
  test_name?: string;
  lab_name?: string;
  notes?: string;
  is_completed?: boolean;
  approval_status?: "approved" | "rejected";
}

// ── API client ────────────────────────────────────────────────────────────────

export const testOrdersApi = {
  /** List all test orders for a specific consultation. */
  listByConsultation: (consultationId: string) =>
    apiClient
      .get<TestOrder[]>(`/consultations/${consultationId}/test-orders/`)
      .then((r) => r.data),

  /** Bulk-create one or more test orders for a consultation. */
  create: (consultationId: string, orders: CreateTestOrderItem[]) =>
    apiClient
      .post<TestOrder[]>(`/consultations/${consultationId}/test-orders/`, { orders })
      .then((r) => r.data),

  /** Update a single test order (lab name, notes, completion status). */
  update: (orderId: string, payload: UpdateTestOrderPayload) =>
    apiClient
      .patch<TestOrder>(`/test-orders/${orderId}/`, payload)
      .then((r) => r.data),

  /** Delete / cancel a test order. */
  delete: (orderId: string) =>
    apiClient.delete(`/test-orders/${orderId}/`),

  /** All pending-approval test orders across the clinic (doctor only). */
  listPending: () =>
    apiClient
      .get<TestOrder[]>("/test-orders/pending/")
      .then((r) => r.data),

  /** Test orders placed by the calling assistant doctor. */
  listMine: () =>
    apiClient
      .get<TestOrder[]>("/test-orders/mine/")
      .then((r) => r.data),
};

// ── Common test presets (Bangladesh clinical context) ─────────────────────────

export const COMMON_TESTS: { category: string; tests: string[] }[] = [
  {
    category: "Blood",
    tests: [
      "CBC (Complete Blood Count)",
      "Blood Sugar (Fasting)",
      "Blood Sugar (Random)",
      "Blood Sugar (2hr PP)",
      "HbA1c",
      "Lipid Profile",
      "SGPT / SGOT",
      "LFT (Liver Function Test)",
      "RFT (Renal Function Test)",
      "Serum Creatinine",
      "Serum Uric Acid",
      "CRP (C-Reactive Protein)",
      "ESR",
      "PT / INR",
      "HBsAg",
      "Anti-HCV",
      "HIV",
    ],
  },
  {
    category: "Thyroid / Hormones",
    tests: ["TSH", "T3", "T4", "Free T3", "Free T4"],
  },
  {
    category: "Urine / Stool",
    tests: ["Urinalysis (R/E)", "Urine C/S", "Urine Microalbumin", "Stool R/E", "Stool C/S"],
  },
  {
    category: "Microbiology",
    tests: [
      "Blood Culture / Sensitivity",
      "Dengue NS1 Antigen",
      "Dengue IgG / IgM",
      "Malaria RDT",
      "Typhoid (Widal Test)",
      "Pregnancy Test (urine hCG)",
    ],
  },
  {
    category: "Imaging / Cardiology",
    tests: [
      "ECG",
      "Chest X-Ray",
      "USG Whole Abdomen",
      "USG Pelvis",
      "Echocardiogram",
      "CT Scan (Head)",
      "MRI (Brain)",
    ],
  },
];
