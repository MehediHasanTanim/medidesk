import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { testOrdersApi, type TestOrder } from "@/features/testOrders/api/testOrdersApi";
import { AddTestsPanel } from "@/features/testOrders/components/LabTestsSection";

// ── Helpers ───────────────────────────────────────────────────────────────────

export const inputSm: React.CSSProperties = {
  padding: "5px 9px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  fontSize: font.sm,
  color: colors.text,
  background: colors.white,
  outline: "none",
  boxSizing: "border-box" as const,
};

export const statusBadge = (s: string): React.CSSProperties => {
  if (s === "approved")  return { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" };
  if (s === "rejected")  return { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" };
  return { background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a" };
};

export const statusLabel = (s: string) =>
  s === "approved" ? "Approved" : s === "rejected" ? "Rejected" : "Awaiting Approval";

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  consultationId: string;
  patientName: string;
  orderedByName: string;
  orderedAt: string | null;
  orders: TestOrder[];           // pending-only snapshot (for header count)
  onChanged: () => void;         // invalidates parent's pending list
}

export default function PendingTestsGroup({
  consultationId,
  patientName,
  orderedByName,
  orderedAt,
  orders,
  onChanged,
}: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVals, setEditVals] = useState({ test_name: "", lab_name: "", notes: "" });
  const [showAdd, setShowAdd] = useState(false);

  // Fetch ALL orders for this consultation when the panel is open
  const { data: allOrders = [], isLoading: loadingAll } = useQuery<TestOrder[]>({
    queryKey: ["test-orders", consultationId],
    queryFn: () => testOrdersApi.listByConsultation(consultationId),
    enabled: expanded,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["test-orders", consultationId] });
    onChanged();
  };

  const startEdit = (o: TestOrder) => {
    setEditingId(o.id);
    setEditVals({ test_name: o.test_name, lab_name: o.lab_name, notes: o.notes });
  };

  const saveMutation = useMutation({
    mutationFn: (id: string) => testOrdersApi.update(id, {
      test_name: editVals.test_name.trim(),
      lab_name: editVals.lab_name.trim(),
      notes: editVals.notes.trim(),
    }),
    onSuccess: () => { setEditingId(null); refresh(); },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => testOrdersApi.update(id, { approval_status: "approved" }),
    onSuccess: refresh,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => testOrdersApi.update(id, { approval_status: "rejected" }),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => testOrdersApi.delete(id),
    onSuccess: refresh,
  });

  const approveAllMutation = useMutation({
    mutationFn: () => {
      const pending = expanded
        ? allOrders.filter((o) => o.approval_status === "pending")
        : orders;
      return Promise.all(pending.map((o) => testOrdersApi.update(o.id, { approval_status: "approved" })));
    },
    onSuccess: refresh,
  });

  const anyBusy =
    approveMutation.isPending || rejectMutation.isPending ||
    deleteMutation.isPending || approveAllMutation.isPending || saveMutation.isPending;

  const pendingCount = orders.length;

  return (
    <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, marginBottom: 12, overflow: "hidden" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", gap: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: "#fef9c3",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
        }}>
          🧪
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}>
            {patientName}
          </div>
          <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
            {pendingCount} pending · By: {orderedByName}
            {orderedAt && ` · ${new Date(orderedAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}`}
          </div>
        </div>

        <span style={{
          ...statusBadge("pending"),
          padding: "3px 10px", borderRadius: 999, fontSize: font.sm, fontWeight: 600, flexShrink: 0,
        }}>
          Awaiting Approval
        </span>

        <button
          onClick={() => { setExpanded((e) => !e); if (showAdd) setShowAdd(false); }}
          style={{
            background: "none", border: `1px solid ${colors.border}`,
            borderRadius: radius.md, padding: "5px 14px",
            cursor: "pointer", fontSize: font.sm, color: colors.textMuted, flexShrink: 0,
          }}
        >
          {expanded ? "Hide" : "Review"}
        </button>

        <button
          onClick={() => approveAllMutation.mutate()}
          disabled={anyBusy || pendingCount === 0}
          style={{
            background: colors.success, color: colors.white, border: "none",
            borderRadius: radius.md, padding: "6px 16px",
            cursor: (anyBusy || pendingCount === 0) ? "not-allowed" : "pointer",
            fontSize: font.sm, fontWeight: 600, flexShrink: 0,
            opacity: approveAllMutation.isPending ? 0.7 : 1,
          }}
        >
          {approveAllMutation.isPending ? "Approving…" : "Approve All"}
        </button>
      </div>

      {/* ── Expanded review panel ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${colors.border}`, padding: 20, background: colors.bg }}>

          {/* Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.textMuted, letterSpacing: "0.05em" }}>
              TEST ORDERS {allOrders.length > 0 && `(${allOrders.length})`}
            </div>
            <button
              onClick={() => { setShowAdd((s) => !s); setEditingId(null); }}
              style={{
                padding: "5px 14px", background: colors.primary, color: colors.white,
                border: "none", borderRadius: radius.md, cursor: "pointer",
                fontSize: font.sm, fontWeight: 600,
              }}
            >
              {showAdd ? "Cancel Add" : "+ Add Test"}
            </button>
          </div>

          {showAdd && (
            <div style={{ marginBottom: 16 }}>
              <AddTestsPanel
                consultationId={consultationId}
                onAdded={() => { setShowAdd(false); refresh(); }}
                onCancel={() => setShowAdd(false)}
              />
            </div>
          )}

          {loadingAll && (
            <p style={{ color: colors.textMuted, fontSize: font.sm, margin: "8px 0" }}>
              Loading tests…
            </p>
          )}

          {allOrders.map((o) => (
            <div key={o.id} style={{
              background: colors.white,
              border: `1px solid ${o.approval_status === "pending" ? "#fde68a" : colors.border}`,
              borderRadius: radius.md,
              padding: "12px 14px",
              marginBottom: 8,
            }}>
              {editingId === o.id ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: colors.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Test Name</div>
                      <input
                        style={{ ...inputSm, width: "100%" }}
                        value={editVals.test_name}
                        onChange={(e) => setEditVals((v) => ({ ...v, test_name: e.target.value }))}
                        autoFocus
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: colors.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Lab</div>
                      <input
                        style={{ ...inputSm, width: "100%" }}
                        value={editVals.lab_name}
                        onChange={(e) => setEditVals((v) => ({ ...v, lab_name: e.target.value }))}
                        placeholder="e.g. Popular"
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: colors.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Instructions</div>
                      <input
                        style={{ ...inputSm, width: "100%" }}
                        value={editVals.notes}
                        onChange={(e) => setEditVals((v) => ({ ...v, notes: e.target.value }))}
                        placeholder="e.g. Fasting required"
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => saveMutation.mutate(o.id)}
                      disabled={saveMutation.isPending || !editVals.test_name.trim()}
                      style={{
                        padding: "5px 16px", background: colors.primary, color: colors.white,
                        border: "none", borderRadius: radius.md, cursor: "pointer",
                        fontSize: font.sm, fontWeight: 600,
                        opacity: saveMutation.isPending ? 0.7 : 1,
                      }}
                    >
                      {saveMutation.isPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        padding: "5px 14px", background: "none", color: colors.textMuted,
                        border: `1px solid ${colors.border}`, borderRadius: radius.md,
                        cursor: "pointer", fontSize: font.sm,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: colors.text, fontSize: font.base }}>
                      {o.test_name}
                    </div>
                    <div style={{ fontSize: font.sm, color: colors.textMuted, marginTop: 2 }}>
                      {o.lab_name && <span>🏥 {o.lab_name}</span>}
                      {o.lab_name && o.notes && <span> · </span>}
                      {o.notes && <span style={{ fontStyle: "italic" }}>{o.notes}</span>}
                    </div>
                  </div>

                  <span style={{
                    ...statusBadge(o.approval_status),
                    padding: "2px 9px", borderRadius: 999,
                    fontSize: "11px", fontWeight: 600, flexShrink: 0,
                  }}>
                    {statusLabel(o.approval_status)}
                  </span>

                  <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                    <button
                      onClick={() => startEdit(o)}
                      disabled={anyBusy}
                      title="Edit this test"
                      style={{
                        padding: "4px 12px", background: colors.white,
                        border: `1px solid ${colors.border}`, borderRadius: radius.md,
                        cursor: anyBusy ? "not-allowed" : "pointer",
                        fontSize: font.sm, color: colors.text,
                      }}
                    >
                      ✏ Edit
                    </button>
                    {o.approval_status === "pending" && (
                      <>
                        <button
                          onClick={() => approveMutation.mutate(o.id)}
                          disabled={anyBusy}
                          style={{
                            padding: "4px 12px", background: "#16a34a", color: colors.white,
                            border: "none", borderRadius: radius.md,
                            cursor: anyBusy ? "not-allowed" : "pointer",
                            fontSize: font.sm, fontWeight: 600,
                          }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(o.id)}
                          disabled={anyBusy}
                          style={{
                            padding: "4px 12px", background: colors.white, color: colors.danger,
                            border: `1px solid ${colors.danger}`, borderRadius: radius.md,
                            cursor: anyBusy ? "not-allowed" : "pointer", fontSize: font.sm, fontWeight: 600,
                          }}
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { if (confirm(`Delete "${o.test_name}"?`)) deleteMutation.mutate(o.id); }}
                      disabled={anyBusy}
                      title="Delete"
                      style={{
                        background: "none", border: "none", color: colors.textMuted,
                        cursor: anyBusy ? "not-allowed" : "pointer",
                        fontSize: 18, lineHeight: 1, padding: "0 2px",
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
