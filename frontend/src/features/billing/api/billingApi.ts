import apiClient from "@/shared/lib/apiClient";

export type InvoiceStatus = "draft" | "issued" | "paid" | "partially_paid" | "cancelled";
export type PaymentMethod = "cash" | "bkash" | "nagad" | "card";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "#6b7280",
  issued: "#1a56db",
  paid: "#059669",
  partially_paid: "#d97706",
  cancelled: "#dc2626",
};

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: string;
  total?: string;
}

export interface InvoiceSummary {
  invoice_id: string;
  invoice_number: string;
  patient_id: string;
  status: InvoiceStatus;
  subtotal: string;
  discount_percent: string;
  total_due: string;
  created_at: string | null;
  item_count: number;
}

export interface InvoiceDetail extends InvoiceSummary {
  consultation_id: string | null;
  items: InvoiceItem[];
  payments: Payment[];
}

export interface Payment {
  payment_id: string;
  amount: string;
  method: PaymentMethod;
  transaction_ref: string;
  paid_at: string | null;
}

export interface CreateInvoicePayload {
  patient_id: string;
  consultation_id?: string;
  items: Array<{ description: string; quantity: number; unit_price: number }>;
  discount_percent?: number;
}

export interface RecordPaymentPayload {
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  transaction_ref?: string;
}

export interface RecordPaymentResponse {
  payment_id: string;
  invoice_id: string;
  amount_paid: string;
  invoice_status: InvoiceStatus;
  balance_remaining: string;
}

export interface IncomeByMethod {
  cash: number;
  bkash: number;
  nagad: number;
  card: number;
}

export interface DailyIncomeRow {
  date: string;
  total: number;
  cash: number;
  bkash: number;
  nagad: number;
  card: number;
}

export interface IncomeReport {
  from_date: string;
  to_date: string;
  total_collected: number;
  by_method: IncomeByMethod;
  total_invoices: number;
  paid_invoices: number;
  daily_breakdown: DailyIncomeRow[];
}

export const billingApi = {
  listByPatient: (patientId: string) =>
    apiClient
      .get<InvoiceSummary[]>("/invoices/", { params: { patient_id: patientId } })
      .then((r) => r.data),

  /** GET /invoices/?consultation_id= — returns the invoice for a consultation, or null. */
  getByConsultation: (consultationId: string) =>
    apiClient
      .get<InvoiceSummary[]>("/invoices/", { params: { consultation_id: consultationId } })
      .then((r) => r.data[0] ?? null),

  getInvoice: (invoiceId: string) =>
    apiClient.get<InvoiceDetail>(`/invoices/${invoiceId}/`).then((r) => r.data),

  createInvoice: (payload: CreateInvoicePayload) =>
    apiClient.post<{ invoice_id: string; invoice_number: string; status: string; total_due: string }>(
      "/invoices/", payload
    ).then((r) => r.data),

  recordPayment: (payload: RecordPaymentPayload) =>
    apiClient
      .post<RecordPaymentResponse>("/payments/", payload)
      .then((r) => r.data),

  /** PATCH /invoices/<id>/ — cancel an issued or partially-paid invoice. */
  cancelInvoice: (invoiceId: string) =>
    apiClient
      .patch<{ invoice_id: string; invoice_number: string; status: string }>(
        `/invoices/${invoiceId}/`,
        { status: "cancelled" }
      )
      .then((r) => r.data),

  /** Opens the invoice PDF in a new tab (inline) or triggers download. */
  openPDF: (invoiceId: string, download = false) => {
    const token = localStorage.getItem("access_token");
    const url = `${apiClient.defaults.baseURL}/invoices/${invoiceId}/pdf/${download ? "?download=1" : ""}`;
    // Fetch as blob so we can pass the JWT header
    return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to generate PDF");
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        if (download) a.download = `invoice-${invoiceId.slice(0, 8)}.pdf`;
        else a.target = "_blank";
        a.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      });
  },

  getIncomeReport: (fromDate: string, toDate: string) =>
    apiClient
      .get<IncomeReport>("/income-report/", { params: { from_date: fromDate, to_date: toDate } })
      .then((r) => r.data),
};
