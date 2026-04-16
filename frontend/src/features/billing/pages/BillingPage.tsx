import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { billingApi, PAYMENT_METHOD_LABELS, INVOICE_STATUS_COLORS } from "@/features/billing/api/billingApi";
import type { InvoiceSummary, InvoiceDetail, PaymentMethod, CreateInvoicePayload } from "@/features/billing/api/billingApi";
import apiClient from "@/shared/lib/apiClient";

const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: `1px solid ${colors.border}`, borderRadius: radius.md,
  fontSize: font.base, boxSizing: "border-box" as const,
  color: colors.text, background: colors.bg,
};

interface PatientResult {
  id: string;
  patient_id: string;
  full_name: string;
  phone: string;
}

function StatusBadge({ status }: { status: string }) {
  const color = INVOICE_STATUS_COLORS[status as keyof typeof INVOICE_STATUS_COLORS] ?? colors.textMuted;
  return (
    <span style={{
      background: `${color}18`, color, border: `1px solid ${color}44`,
      padding: "2px 10px", borderRadius: 999, fontSize: "12px", fontWeight: 600,
    }}>
      {status.replace("_", " ").toUpperCase()}
    </span>
  );
}

// ── Record Payment Modal ───────────────────────────────────────────────────────
function RecordPaymentModal({ invoice, onClose }: { invoice: InvoiceDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(invoice.total_due);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  const pay = useMutation({
    mutationFn: () => billingApi.recordPayment({
      invoice_id: invoice.invoice_id,
      amount: parseFloat(amount),
      method,
      transaction_ref: ref,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", invoice.invoice_id] });
      qc.invalidateQueries({ queryKey: ["invoices", invoice.patient_id] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Failed to record payment.");
    },
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, padding: 28, width: 420, boxShadow: shadow.lg }}>
        <h3 style={{ margin: "0 0 16px", fontSize: font.lg, fontWeight: 600 }}>Record Payment</h3>
        <p style={{ margin: "0 0 18px", color: colors.textMuted, fontSize: font.sm }}>Invoice {invoice.invoice_number} · Total due: ৳{invoice.total_due}</p>

        {error && <div style={{ background: colors.dangerLight, border: `1px solid #fecaca`, color: colors.danger, padding: "10px 14px", borderRadius: radius.md, marginBottom: 14, fontSize: font.sm }}>{error}</div>}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Amount (৳)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} min="0" step="0.01" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} style={inputStyle}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Transaction Ref (optional)</label>
          <input value={ref} onChange={(e) => setRef(e.target.value)} style={inputStyle} placeholder="bKash/Nagad transaction ID" />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", background: colors.borderLight, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}>Cancel</button>
          <button onClick={() => pay.mutate()} disabled={pay.isPending || !amount} style={{ padding: "8px 18px", background: colors.success, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}>
            {pay.isPending ? "Saving…" : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Invoice Modal ───────────────────────────────────────────────────────
function CreateInvoiceModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [items, setItems] = useState([{ description: "", quantity: 1, unit_price: "" }]);
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: () => {
      const payload: CreateInvoicePayload = {
        patient_id: patientId,
        items: items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: parseFloat(i.unit_price) })),
        discount_percent: parseFloat(discount) || 0,
      };
      return billingApi.createInvoice(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", patientId] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Failed to create invoice.");
    },
  });

  const updateItem = (i: number, key: string, val: string | number) =>
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item));

  const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.unit_price) || 0) * i.quantity, 0);
  const total = subtotal * (1 - (parseFloat(discount) || 0) / 100);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, padding: 28, width: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: shadow.lg }}>
        <h3 style={{ margin: "0 0 20px", fontSize: font.lg, fontWeight: 600 }}>Create Invoice</h3>

        {error && <div style={{ background: colors.dangerLight, border: `1px solid #fecaca`, color: colors.danger, padding: "10px 14px", borderRadius: radius.md, marginBottom: 14, fontSize: font.sm }}>{error}</div>}

        {/* Line items */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontWeight: 500, fontSize: font.base }}>Items</label>
            <button onClick={() => setItems((p) => [...p, { description: "", quantity: 1, unit_price: "" }])}
              style={{ fontSize: font.sm, color: colors.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              + Add Item
            </button>
          </div>
          {items.map((item, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 100px 28px", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} style={inputStyle} />
              <input type="number" placeholder="Qty" value={item.quantity} min={1}
                onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)} style={inputStyle} />
              <input type="number" placeholder="Price ৳" value={item.unit_price}
                onChange={(e) => updateItem(i, "unit_price", e.target.value)} style={inputStyle} />
              {items.length > 1 && (
                <button onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                  style={{ color: colors.danger, background: "none", border: "none", cursor: "pointer", fontSize: "16px", fontWeight: 700 }}>×</button>
              )}
            </div>
          ))}
        </div>

        {/* Discount */}
        <div style={{ marginBottom: 16, maxWidth: 160 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Discount %</label>
          <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} style={inputStyle} min="0" max="100" />
        </div>

        {/* Totals */}
        <div style={{ background: colors.bg, borderRadius: radius.md, padding: "12px 16px", marginBottom: 20, fontSize: font.base }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: colors.textMuted, marginBottom: 4 }}>
            <span>Subtotal</span><span>৳{subtotal.toFixed(2)}</span>
          </div>
          {parseFloat(discount) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", color: colors.warning, marginBottom: 4 }}>
              <span>Discount ({discount}%)</span><span>-৳{(subtotal * parseFloat(discount) / 100).toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: colors.text, borderTop: `1px solid ${colors.border}`, paddingTop: 8, marginTop: 4 }}>
            <span>Total</span><span>৳{total.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", background: colors.borderLight, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}>Cancel</button>
          <button onClick={() => create.mutate()} disabled={create.isPending || items.some(i => !i.description || !i.unit_price)}
            style={{ padding: "8px 18px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}>
            {create.isPending ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invoice Detail Panel ───────────────────────────────────────────────────────
function InvoicePanel({ invoiceId, patientId, onBack }: { invoiceId: string; patientId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => billingApi.getInvoice(invoiceId),
  });

  const cancelMutation = useMutation({
    mutationFn: () => billingApi.cancelInvoice(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices", patientId] });
      setConfirmCancel(false);
    },
  });

  if (isLoading) return <div style={{ padding: 40, color: colors.textMuted }}>Loading invoice…</div>;
  if (!invoice) return null;

  const totalPaid = invoice.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const canPay = ["issued", "partially_paid"].includes(invoice.status);
  const canCancel = ["issued", "partially_paid", "draft"].includes(invoice.status);

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", fontSize: font.base, padding: "0 0 16px", fontWeight: 500 }}>
        ← Back to invoices
      </button>

      <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: font.xl, fontWeight: 700 }}>{invoice.invoice_number}</h2>
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sm }}>
              {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-BD") : ""}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusBadge status={invoice.status} />
            {canPay && (
              <button onClick={() => setShowPayment(true)}
                style={{ padding: "8px 18px", background: colors.success, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}>
                Record Payment
              </button>
            )}
            {canCancel && !confirmCancel && (
              <button onClick={() => setConfirmCancel(true)}
                style={{ padding: "8px 16px", background: colors.white, color: colors.danger, border: `1px solid ${colors.danger}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.sm, fontWeight: 600 }}>
                Cancel Invoice
              </button>
            )}
            {confirmCancel && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: `1px solid #fecaca`, borderRadius: radius.md, padding: "6px 12px" }}>
                <span style={{ fontSize: font.sm, color: colors.danger, fontWeight: 500 }}>Confirm cancel?</span>
                <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}
                  style={{ padding: "4px 12px", background: colors.danger, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.sm, fontWeight: 600 }}>
                  {cancelMutation.isPending ? "…" : "Yes"}
                </button>
                <button onClick={() => setConfirmCancel(false)}
                  style={{ padding: "4px 10px", background: "none", border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.sm }}>
                  No
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
          <thead>
            <tr style={{ background: colors.bg }}>
              {["Description", "Qty", "Unit Price", "Total"].map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: h === "Description" ? "left" : "right", fontSize: font.sm, fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                <td style={{ padding: "10px 12px", fontSize: font.base }}>{item.description}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: font.base }}>{item.quantity}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: font.base }}>৳{parseFloat(item.unit_price).toFixed(2)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: font.base }}>৳{item.total ? parseFloat(item.total).toFixed(2) : (parseFloat(item.unit_price) * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ maxWidth: 260, marginLeft: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: font.base, color: colors.textMuted, marginBottom: 6 }}>
            <span>Subtotal</span><span>৳{parseFloat(invoice.subtotal).toFixed(2)}</span>
          </div>
          {parseFloat(invoice.discount_percent) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: font.base, color: colors.warning, marginBottom: 6 }}>
              <span>Discount ({invoice.discount_percent}%)</span>
              <span>-৳{(parseFloat(invoice.subtotal) * parseFloat(invoice.discount_percent) / 100).toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: font.md, borderTop: `1px solid ${colors.border}`, paddingTop: 8 }}>
            <span>Total Due</span><span>৳{parseFloat(invoice.total_due).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payments */}
      {invoice.payments.length > 0 && (
        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: font.md, fontWeight: 600 }}>Payments</h3>
          {invoice.payments.map((p) => (
            <div key={p.payment_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${colors.borderLight}` }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: font.base }}>{PAYMENT_METHOD_LABELS[p.method]}</span>
                {p.transaction_ref && <span style={{ marginLeft: 8, color: colors.textMuted, fontSize: font.sm }}>#{p.transaction_ref}</span>}
                <div style={{ fontSize: font.sm, color: colors.textMuted, marginTop: 2 }}>
                  {p.paid_at ? new Date(p.paid_at).toLocaleString("en-BD") : ""}
                </div>
              </div>
              <span style={{ fontWeight: 700, color: colors.success, fontSize: font.md }}>৳{parseFloat(p.amount).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 10, fontWeight: 700, fontSize: font.base }}>
            <span style={{ color: colors.textMuted, marginRight: 12 }}>Total Paid</span>
            <span style={{ color: colors.success }}>৳{totalPaid.toFixed(2)}</span>
          </div>
        </div>
      )}

      {showPayment && invoice && (
        <RecordPaymentModal invoice={invoice} onClose={() => setShowPayment(false)} />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [searching, setSearching] = useState(false);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", selectedPatient?.id],
    queryFn: () => billingApi.listByPatient(selectedPatient!.id),
    enabled: !!selectedPatient && !selectedInvoiceId,
  });

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await apiClient.get<{ results: PatientResult[] }>("/patients/search/", { params: { q: search } });
      setSearchResults(res.data.results);
    } finally {
      setSearching(false);
    }
  };

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>Billing</h1>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>Create invoices and record payments</p>
        </div>

        {selectedInvoiceId && selectedPatient ? (
          <InvoicePanel
            invoiceId={selectedInvoiceId}
            patientId={selectedPatient.id}
            onBack={() => setSelectedInvoiceId(null)}
          />
        ) : (
          <>
            {/* Patient search */}
            <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 24, marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: font.md, fontWeight: 600 }}>Find Patient</h2>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by name, phone or patient ID…"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={handleSearch} disabled={searching}
                  style={{ padding: "9px 20px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base, whiteSpace: "nowrap" }}>
                  {searching ? "Searching…" : "Search"}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div style={{ marginTop: 12, border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: "hidden" }}>
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedPatient(p); setSearchResults([]); setSearch(""); }}
                      style={{ padding: "10px 16px", cursor: "pointer", borderBottom: `1px solid ${colors.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = colors.bg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = colors.white)}
                    >
                      <div>
                        <span style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}>{p.full_name}</span>
                        <span style={{ marginLeft: 10, color: colors.textMuted, fontSize: font.sm }}>{p.phone}</span>
                      </div>
                      <span style={{ fontSize: font.sm, color: colors.textMuted }}>{p.patient_id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoice list */}
            {selectedPatient && (
              <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: font.md, color: colors.text }}>{selectedPatient.full_name}</span>
                    <span style={{ marginLeft: 10, color: colors.textMuted, fontSize: font.sm }}>{selectedPatient.phone}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setSelectedPatient(null)}
                      style={{ padding: "6px 14px", background: colors.borderLight, color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.sm }}>
                      Clear
                    </button>
                    <button onClick={() => setShowCreate(true)}
                      style={{ padding: "6px 16px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.sm }}>
                      + New Invoice
                    </button>
                  </div>
                </div>

                {invoices.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>No invoices found for this patient.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: colors.bg }}>
                        {["Invoice #", "Date", "Items", "Total Due", "Status", ""].map((h) => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: font.sm, fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(invoices as InvoiceSummary[]).map((inv) => (
                        <tr key={inv.invoice_id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                          <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: font.base }}>{inv.invoice_number}</td>
                          <td style={{ padding: "12px 16px", color: colors.textMuted, fontSize: font.base }}>
                            {inv.created_at ? new Date(inv.created_at).toLocaleDateString("en-BD") : "—"}
                          </td>
                          <td style={{ padding: "12px 16px", color: colors.textMuted, fontSize: font.base }}>{inv.item_count}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: font.base }}>৳{parseFloat(inv.total_due).toFixed(2)}</td>
                          <td style={{ padding: "12px 16px" }}><StatusBadge status={inv.status} /></td>
                          <td style={{ padding: "12px 16px" }}>
                            <button onClick={() => setSelectedInvoiceId(inv.invoice_id)}
                              style={{ padding: "4px 14px", background: colors.primaryLight, color: colors.primary, border: `1px solid #bfdbfe`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        {showCreate && selectedPatient && (
          <CreateInvoiceModal patientId={selectedPatient.id} onClose={() => setShowCreate(false)} />
        )}
      </div>
    </AppShell>
  );
}
