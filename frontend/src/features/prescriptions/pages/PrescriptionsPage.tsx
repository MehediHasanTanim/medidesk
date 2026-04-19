import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { prescriptionsApi, type PendingPrescription } from "@/features/prescriptions/api/prescriptionsApi";
import PrescriptionEditForm from "@/features/prescriptions/components/PrescriptionEditForm";
import { testOrdersApi, type TestOrder } from "@/features/testOrders/api/testOrdersApi";
import { AddTestsPanel } from "@/features/testOrders/components/LabTestsSection";

function PrescriptionRow({
  rx,
  onApprove,
}: {
  rx: PendingPrescription;
  onApprove: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showAddTests, setShowAddTests] = useState(false);
  const [labTestsAdded, setLabTestsAdded] = useState(false);

  const detailQueryKey = ["prescription-detail", rx.consultation_id];

  const { data: detail, isLoading } = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => prescriptionsApi.getByConsultation(rx.consultation_id),
    enabled: expanded,
  });

  const handleSaved = () => {
    setEditMode(false);
    qc.invalidateQueries({ queryKey: detailQueryKey });
  };

  const handleApproved = () => {
    setEditMode(false);
    // PrescriptionEditForm already called approve — just refresh the pending list
    qc.invalidateQueries({ queryKey: ["pending-prescriptions"] });
  };

  return (
    <div style={{
      background: colors.white, borderRadius: radius.lg,
      boxShadow: shadow.sm, marginBottom: 12, overflow: "hidden",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}>
            {rx.patient_name}
          </div>
          <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
            {rx.item_count} medication{rx.item_count !== 1 ? "s" : ""}
            {" · "}By: {rx.prescribed_by_name}
            {rx.follow_up_date && <span> · Follow-up: {rx.follow_up_date}</span>}
            {rx.created_at && (
              <span>
                {" · "}
                {new Date(rx.created_at).toLocaleDateString("en-BD", {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        <span style={{
          background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a",
          padding: "3px 10px", borderRadius: 999, fontSize: font.sm, fontWeight: 600,
        }}>
          Pending Approval
        </span>

        <button
          onClick={() => { setExpanded((e) => !e); if (editMode) setEditMode(false); if (showAddTests) setShowAddTests(false); }}
          style={{
            background: "none", border: `1px solid ${colors.border}`,
            borderRadius: radius.md, padding: "5px 14px",
            cursor: "pointer", fontSize: font.sm, color: colors.textMuted,
          }}
        >
          {expanded ? "Hide" : "Review"}
        </button>

        <button
          onClick={() => onApprove(rx.prescription_id)}
          style={{
            background: colors.success, color: colors.white, border: "none",
            borderRadius: radius.md, padding: "6px 16px",
            cursor: "pointer", fontSize: font.sm, fontWeight: 600,
          }}
        >
          Approve
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${colors.border}`, padding: "20px", background: colors.bg }}>
          {isLoading && (
            <p style={{ color: colors.textMuted, margin: 0, fontSize: font.sm }}>
              Loading prescription…
            </p>
          )}

          {!isLoading && !detail && (
            <p style={{ color: colors.danger, margin: 0, fontSize: font.sm }}>
              Failed to load details.
            </p>
          )}

          {!isLoading && detail && (
            editMode ? (
              /* ── Inline edit form ── */
              <PrescriptionEditForm
                rx={detail}
                onSaved={handleSaved}
                onSavedAndApproved={handleApproved}
                onCancel={() => setEditMode(false)}
              />
            ) : (
              /* ── Read-only detail view ── */
              <div>
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", marginBottom: 12,
                }}>
                  <div style={{
                    fontSize: font.sm, fontWeight: 600, color: colors.textMuted,
                    letterSpacing: "0.05em",
                  }}>
                    PRESCRIPTION ITEMS
                  </div>
                  <button
                    onClick={() => setEditMode(true)}
                    style={{
                      padding: "5px 14px",
                      background: colors.white,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.md,
                      cursor: "pointer",
                      fontSize: font.sm,
                      color: colors.text,
                      fontWeight: 500,
                    }}
                  >
                    ✏ Edit Medicines
                  </button>
                </div>

                {detail.items.map((item, i) => (
                  <div key={i} style={{
                    background: colors.white, borderRadius: radius.md,
                    padding: "10px 14px", marginBottom: 8,
                    border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ fontWeight: 600, color: colors.text, fontSize: font.base }}>
                      {item.medicine_name}
                    </div>
                    <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
                      {item.dosage_display} · {item.route}
                      {item.instructions && ` · ${item.instructions}`}
                    </div>
                  </div>
                ))}

                {detail.follow_up_date && (
                  <div style={{
                    marginTop: 10, fontSize: font.sm,
                    color: colors.primary, fontWeight: 500,
                  }}>
                    Follow-up: {detail.follow_up_date}
                  </div>
                )}

                {/* ── Lab tests section ── */}
                <div style={{
                  marginTop: 20,
                  borderTop: `1px solid ${colors.border}`,
                  paddingTop: 16,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: showAddTests ? 12 : 0,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        fontSize: font.sm, fontWeight: 600, color: colors.textMuted,
                        letterSpacing: "0.05em",
                      }}>
                        🧪 LAB TESTS
                      </span>
                      {labTestsAdded && !showAddTests && (
                        <span style={{
                          background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0",
                          padding: "2px 9px", borderRadius: 999, fontSize: "11px", fontWeight: 600,
                        }}>
                          ✓ Tests added
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { setShowAddTests((s) => !s); }}
                      style={{
                        padding: "5px 14px",
                        background: showAddTests ? "none" : colors.primary,
                        color: showAddTests ? colors.textMuted : colors.white,
                        border: showAddTests ? `1px solid ${colors.border}` : "none",
                        borderRadius: radius.md,
                        cursor: "pointer",
                        fontSize: font.sm,
                        fontWeight: 600,
                      }}
                    >
                      {showAddTests ? "Cancel" : "+ Add Lab Tests"}
                    </button>
                  </div>

                  {showAddTests && (
                    <AddTestsPanel
                      consultationId={rx.consultation_id}
                      onAdded={() => {
                        setShowAddTests(false);
                        setLabTestsAdded(true);
                        qc.invalidateQueries({ queryKey: ["test-orders", rx.consultation_id] });
                        qc.invalidateQueries({ queryKey: ["pending-test-orders"] });
                      }}
                      onCancel={() => setShowAddTests(false)}
                    />
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Pending lab-tests group (all pending tests for one consultation) ──────────

const inputSm: React.CSSProperties = {
  padding: "5px 9px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  fontSize: font.sm,
  color: colors.text,
  background: colors.white,
  outline: "none",
  boxSizing: "border-box" as const,
};

// Status badge colours
const statusBadge = (s: string): React.CSSProperties => {
  if (s === "approved")  return { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" };
  if (s === "rejected")  return { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" };
  return { background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a" }; // pending
};
const statusLabel = (s: string) =>
  s === "approved" ? "Approved" : s === "rejected" ? "Rejected" : "Awaiting Approval";

function PendingTestsGroup({
  consultationId,
  patientName,
  orderedByName,
  orderedAt,
  orders,           // pending-only snapshot from parent query (for header count)
  onChanged,        // parent callback — invalidates ["pending-test-orders"]
}: {
  consultationId: string;
  patientName: string;
  orderedByName: string;
  orderedAt: string | null;
  orders: TestOrder[];
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVals, setEditVals] = useState({ test_name: "", lab_name: "", notes: "" });
  const [showAdd, setShowAdd] = useState(false);

  // ── Fetch ALL orders for this consultation when the panel is open ────────────
  const { data: allOrders = [], isLoading: loadingAll } = useQuery<TestOrder[]>({
    queryKey: ["test-orders", consultationId],
    queryFn: () => testOrdersApi.listByConsultation(consultationId),
    enabled: expanded,
  });

  // Invalidate both the local detail and the parent pending list
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

  // Approve all PENDING orders (use allOrders when expanded, else fall back to prop)
  const approveAllMutation = useMutation({
    mutationFn: () => {
      const pending = expanded
        ? allOrders.filter((o) => o.approval_status === "pending")
        : orders;
      return Promise.all(pending.map((o) => testOrdersApi.update(o.id, { approval_status: "approved" })));
    },
    onSuccess: refresh,
  });

  const anyBusy = approveMutation.isPending || rejectMutation.isPending ||
    deleteMutation.isPending || approveAllMutation.isPending || saveMutation.isPending;

  const pendingCount = orders.length; // from parent pending query — always reflects reality

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

          {/* Add tests panel */}
          {showAdd && (
            <div style={{ marginBottom: 16 }}>
              <AddTestsPanel
                consultationId={consultationId}
                onAdded={() => { setShowAdd(false); refresh(); }}
                onCancel={() => setShowAdd(false)}
              />
            </div>
          )}

          {/* Loading state */}
          {loadingAll && (
            <p style={{ color: colors.textMuted, fontSize: font.sm, margin: "8px 0" }}>
              Loading tests…
            </p>
          )}

          {/* Individual test rows — ALL orders, not just pending */}
          {allOrders.map((o) => (
            <div key={o.id} style={{
              background: colors.white,
              border: `1px solid ${o.approval_status === "pending" ? "#fde68a" : colors.border}`,
              borderRadius: radius.md,
              padding: "12px 14px",
              marginBottom: 8,
            }}>
              {editingId === o.id ? (
                /* ── Inline edit form ── */
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
                /* ── Read mode ── */
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

                  {/* Status badge */}
                  <span style={{
                    ...statusBadge(o.approval_status),
                    padding: "2px 9px", borderRadius: 999,
                    fontSize: "11px", fontWeight: 600, flexShrink: 0,
                  }}>
                    {statusLabel(o.approval_status)}
                  </span>

                  {/* Row actions */}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrescriptionsPage() {
  const qc = useQueryClient();

  const { data: pendingRx, isLoading: loadingRx } = useQuery({
    queryKey: ["pending-prescriptions"],
    queryFn: prescriptionsApi.listPending,
  });

  const { data: pendingTests, isLoading: loadingTests } = useQuery({
    queryKey: ["pending-test-orders"],
    queryFn: testOrdersApi.listPending,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => prescriptionsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-prescriptions"] }),
  });

  const totalPending = (pendingRx?.length ?? 0) + (pendingTests?.length ?? 0);
  const isLoading = loadingRx || loadingTests;

  // Group pending tests by consultation_id
  const testGroups = (() => {
    if (!pendingTests?.length) return [];
    const map = new Map<string, { patientName: string; orderedByName: string; orderedAt: string | null; orders: TestOrder[] }>();
    for (const o of pendingTests) {
      if (!map.has(o.consultation_id)) {
        map.set(o.consultation_id, {
          patientName: o.patient_name || o.patient_id,
          orderedByName: o.ordered_by_name,
          orderedAt: o.ordered_at,
          orders: [],
        });
      }
      map.get(o.consultation_id)!.orders.push(o);
    }
    return Array.from(map.entries()).map(([consultationId, g]) => ({ consultationId, ...g }));
  })();

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>
              Approvals
            </h1>
            {totalPending > 0 && (
              <span style={{
                background: colors.danger, color: colors.white,
                borderRadius: 999, padding: "2px 9px", fontSize: font.sm, fontWeight: 700,
              }}>
                {totalPending}
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
            Review prescriptions and lab test orders drafted by assistant doctors
          </p>
        </div>

        {isLoading && <p style={{ color: colors.textMuted }}>Loading…</p>}

        {!isLoading && totalPending === 0 && (
          <div style={{
            background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm,
            padding: "56px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontWeight: 600, color: colors.text, marginBottom: 4 }}>All caught up!</div>
            <div style={{ color: colors.textMuted, fontSize: font.sm }}>No pending approvals.</div>
          </div>
        )}

        {/* ── Pending prescriptions ── */}
        {(pendingRx?.length ?? 0) > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: font.md, fontWeight: 700, color: colors.text }}>
                💊 Prescriptions
              </h2>
              <span style={{
                background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a",
                borderRadius: 999, padding: "1px 9px", fontSize: font.sm, fontWeight: 600,
              }}>
                {pendingRx!.length} pending
              </span>
            </div>
            {pendingRx!.map((rx) => (
              <PrescriptionRow
                key={rx.prescription_id}
                rx={rx}
                onApprove={(id) => approveMutation.mutate(id)}
              />
            ))}
          </div>
        )}

        {/* ── Pending lab tests ── */}
        {testGroups.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: font.md, fontWeight: 700, color: colors.text }}>
                🧪 Lab Tests
              </h2>
              <span style={{
                background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a",
                borderRadius: 999, padding: "1px 9px", fontSize: font.sm, fontWeight: 600,
              }}>
                {pendingTests!.length} pending
              </span>
            </div>
            {testGroups.map((g) => (
              <PendingTestsGroup
                key={g.consultationId}
                consultationId={g.consultationId}
                patientName={g.patientName}
                orderedByName={g.orderedByName}
                orderedAt={g.orderedAt}
                orders={g.orders}
                onChanged={() => qc.invalidateQueries({ queryKey: ["pending-test-orders"] })}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
