import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { colors, font, radius } from "@/shared/styles/theme";
import Toast, { useToast } from "@/shared/components/Toast";
import {
  testOrdersApi,
  COMMON_TESTS,
  type TestOrder,
  type CreateTestOrderItem,
} from "@/features/testOrders/api/testOrdersApi";

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 11px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  fontSize: font.base,
  color: colors.text,
  background: colors.white,
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: font.sm,
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: 4,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
  marginTop: 4,
};

// ── Add-tests panel ───────────────────────────────────────────────────────────

export function AddTestsPanel({
  consultationId,
  onAdded,
  onCancel,
}: {
  consultationId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const { toast, show: showToast, dismiss } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const togglePreset = (test: string) => {
    setSelected((prev) =>
      prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]
    );
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (!val) return;
    if (!selected.includes(val)) setSelected((p) => [...p, val]);
    setCustomInput("");
  };

  const mutation = useMutation({
    mutationFn: () => {
      const orders: CreateTestOrderItem[] = selected.map((test_name) => ({
        test_name,
        lab_name: labName.trim(),
        notes: notes.trim(),
      }));
      return testOrdersApi.create(consultationId, orders);
    },
    onSuccess: () => {
      showToast(`${selected.length} test order${selected.length > 1 ? "s" : ""} submitted`, "success");
      onAdded();
    },
    onError: (e: any) =>
      setError(e?.response?.data?.error ?? "Failed to add test orders"),
  });

  return (
    <div style={{
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      background: "#f8fafc",
      padding: 20,
      marginTop: 12,
    }}>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      {error && (
        <div style={{ background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", borderRadius: radius.md, padding: "8px 12px", marginBottom: 12, fontSize: font.sm }}>
          {error}
        </div>
      )}

      {/* Common test presets */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...sectionHeadingStyle, marginTop: 0 }}>Quick select</div>
        {COMMON_TESTS.map((group) => (
          <div key={group.category} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
              {group.category}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {group.tests.map((test) => {
                const active = selected.includes(test);
                return (
                  <button
                    key={test}
                    onClick={() => togglePreset(test)}
                    style={{
                      padding: "4px 11px",
                      borderRadius: 999,
                      fontSize: font.sm,
                      fontWeight: 500,
                      cursor: "pointer",
                      border: `1px solid ${active ? colors.primary : colors.border}`,
                      background: active ? colors.primary : colors.white,
                      color: active ? colors.white : colors.text,
                      transition: "all 0.12s",
                    }}
                  >
                    {active && <span style={{ marginRight: 4 }}>✓</span>}
                    {test}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Custom test input */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Custom test</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="e.g. Serum Ferritin, VDRL…"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          />
          <button
            onClick={addCustom}
            style={{ padding: "7px 16px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.sm, fontWeight: 600, flexShrink: 0 }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Selected tests preview */}
      {selected.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={sectionHeadingStyle}>Selected ({selected.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selected.map((t) => (
              <span
                key={t}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "#eff6ff", color: colors.primary,
                  border: "1px solid #bfdbfe",
                  borderRadius: 999, padding: "3px 10px", fontSize: font.sm, fontWeight: 500,
                }}
              >
                {t}
                <button
                  onClick={() => setSelected((p) => p.filter((x) => x !== t))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: colors.primary, lineHeight: 1, padding: 0, fontSize: 14, fontWeight: 700 }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lab name & notes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Lab / Diagnostic Centre</label>
          <input
            style={inputStyle}
            placeholder="e.g. Popular Diagnostics"
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Instructions / Notes</label>
          <input
            style={inputStyle}
            placeholder="e.g. Fasting required, bring previous reports"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{ padding: "7px 18px", background: colors.white, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setError("");
            if (selected.length === 0) { setError("Select or add at least one test"); return; }
            mutation.mutate();
          }}
          disabled={mutation.isPending || selected.length === 0}
          style={{
            padding: "7px 20px",
            background: selected.length === 0 ? colors.border : colors.primary,
            color: colors.white,
            border: "none", borderRadius: radius.md,
            cursor: selected.length === 0 ? "not-allowed" : "pointer",
            fontSize: font.base, fontWeight: 600,
            opacity: mutation.isPending ? 0.7 : 1,
          }}
        >
          {mutation.isPending ? "Submitting…" : `Submit ${selected.length > 0 ? `${selected.length} ` : ""}Test${selected.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

// ── Single test-order row ─────────────────────────────────────────────────────

function TestOrderRow({
  order,
  userRole,
  onUpdated,
  onDeleted,
}: {
  order: TestOrder;
  userRole: string;
  onUpdated: (updated: TestOrder) => void;
  onDeleted: (id: string) => void;
}) {
  const { show: showToast } = useToast();

  const isDoctor = userRole === "doctor";
  const isAssistant = userRole === "assistant_doctor";
  const isPending = order.approval_status === "pending";
  const isRejected = order.approval_status === "rejected";

  // Doctor: can always modify. Assistant: only if still pending
  const canModify = isDoctor || (isAssistant && isPending);
  // Completion toggle only makes sense on approved orders
  const canToggleComplete = canModify && order.approval_status === "approved";

  const toggleMutation = useMutation({
    mutationFn: () => testOrdersApi.update(order.id, { is_completed: !order.is_completed }),
    onSuccess: (updated) => onUpdated(updated),
    onError: () => showToast("Failed to update", "error"),
  });

  const approveMutation = useMutation({
    mutationFn: () => testOrdersApi.update(order.id, { approval_status: "approved" }),
    onSuccess: (updated) => { onUpdated(updated); showToast("Test order approved", "success"); },
    onError: () => showToast("Failed to approve", "error"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => testOrdersApi.update(order.id, { approval_status: "rejected" }),
    onSuccess: (updated) => { onUpdated(updated); showToast("Test order rejected", "info"); },
    onError: () => showToast("Failed to reject", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => testOrdersApi.delete(order.id),
    onSuccess: () => onDeleted(order.id),
    onError: () => showToast("Failed to delete", "error"),
  });

  // Row background and border based on approval state
  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "10px 14px",
    borderRadius: radius.md,
    marginBottom: 8,
    transition: "background 0.15s",
    ...(isPending
      ? { background: "#fffbeb", border: "1px solid #fde68a" }
      : isRejected
      ? { background: "#fef2f2", border: "1px solid #fecaca", opacity: 0.75 }
      : order.is_completed
      ? { background: "#f0fdf4", border: "1px solid #bbf7d0" }
      : { background: colors.white, border: `1px solid ${colors.border}` }),
  };

  return (
    <div style={rowStyle}>
      {/* Completion checkbox — only on approved, non-rejected orders */}
      {canToggleComplete ? (
        <button
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          title={order.is_completed ? "Mark as pending" : "Mark as completed"}
          style={{
            flexShrink: 0, marginTop: 2,
            width: 20, height: 20, borderRadius: 4,
            border: `2px solid ${order.is_completed ? "#16a34a" : colors.border}`,
            background: order.is_completed ? "#16a34a" : colors.white,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: colors.white, fontSize: 13, fontWeight: 700, padding: 0,
          }}
        >
          {order.is_completed ? "✓" : ""}
        </button>
      ) : (
        <div style={{
          flexShrink: 0, marginTop: 2,
          width: 20, height: 20, borderRadius: 4,
          border: `2px solid ${isPending ? "#f59e0b" : isRejected ? "#f87171" : order.is_completed ? "#16a34a" : colors.border}`,
          background: order.is_completed ? "#16a34a" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: colors.white, fontSize: 13, fontWeight: 700,
        }}>
          {order.is_completed && "✓"}
          {isPending && <span style={{ fontSize: 10, color: "#f59e0b" }}>?</span>}
          {isRejected && <span style={{ fontSize: 11, color: "#f87171" }}>✗</span>}
        </div>
      )}

      {/* Test info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600,
          color: isRejected ? "#b91c1c" : order.is_completed ? "#166534" : colors.text,
          fontSize: font.base,
          textDecoration: isRejected || order.is_completed ? "line-through" : "none",
          opacity: isRejected || order.is_completed ? 0.75 : 1,
        }}>
          {order.test_name}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 3 }}>
          {order.lab_name && (
            <span style={{ fontSize: font.sm, color: colors.textMuted }}>🏥 {order.lab_name}</span>
          )}
          {order.notes && (
            <span style={{ fontSize: font.sm, color: colors.textMuted, fontStyle: "italic" }}>{order.notes}</span>
          )}
          <span style={{ fontSize: font.sm, color: colors.textMuted }}>
            By {order.ordered_by_name || "—"}
            {order.ordered_at && ` · ${new Date(order.ordered_at).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}`}
          </span>
        </div>
        {order.is_completed && order.completed_at && (
          <div style={{ fontSize: font.sm, color: "#166534", marginTop: 2 }}>
            ✓ Done {new Date(order.completed_at).toLocaleString("en-BD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, alignSelf: "flex-start", marginTop: 2 }}>
        <span style={{
          padding: "2px 10px",
          borderRadius: 999,
          fontSize: "11px",
          fontWeight: 700,
          whiteSpace: "nowrap",
          ...(isPending
            ? { background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a" }
            : isRejected
            ? { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" }
            : order.is_completed
            ? { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }
            : { background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a" }),
        }}>
          {isPending ? "Awaiting Approval" : isRejected ? "Rejected" : order.is_completed ? "Done" : "Pending"}
        </span>

        {/* Approve / Reject buttons — doctor only, on pending orders */}
        {isDoctor && isPending && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              title="Approve this test order"
              style={{
                padding: "3px 12px",
                background: "#16a34a",
                color: colors.white,
                border: "none",
                borderRadius: radius.md,
                cursor: "pointer",
                fontSize: font.sm,
                fontWeight: 600,
                opacity: approveMutation.isPending ? 0.6 : 1,
              }}
            >
              {approveMutation.isPending ? "…" : "✓ Approve"}
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              title="Reject this test order"
              style={{
                padding: "3px 12px",
                background: colors.white,
                color: colors.danger,
                border: `1px solid ${colors.danger}`,
                borderRadius: radius.md,
                cursor: "pointer",
                fontSize: font.sm,
                fontWeight: 600,
                opacity: rejectMutation.isPending ? 0.6 : 1,
              }}
            >
              {rejectMutation.isPending ? "…" : "✗ Reject"}
            </button>
          </div>
        )}
      </div>

      {/* Delete button */}
      {canModify && (
        <button
          onClick={() => { if (confirm(`Remove "${order.test_name}"?`)) deleteMutation.mutate(); }}
          disabled={deleteMutation.isPending}
          title="Remove test order"
          style={{
            flexShrink: 0, background: "none", border: "none",
            color: colors.textMuted, cursor: "pointer",
            fontSize: 18, lineHeight: 1, padding: "0 2px",
            alignSelf: "flex-start", marginTop: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

interface Props {
  consultationId: string;
  userRole: string;
}

const CLINICAL_ROLES = new Set(["doctor", "assistant_doctor"]);

export default function LabTestsSection({ consultationId, userRole }: Props) {
  const qc = useQueryClient();
  const { toast, show: showToast, dismiss } = useToast();
  const [showAddPanel, setShowAddPanel] = useState(false);

  const isDoctor = userRole === "doctor";
  const canAdd = CLINICAL_ROLES.has(userRole);

  const { data: orders = [], isLoading } = useQuery<TestOrder[]>({
    queryKey: ["test-orders", consultationId],
    queryFn: () => testOrdersApi.listByConsultation(consultationId),
    staleTime: 0,
  });

  const handleAdded = () => {
    qc.invalidateQueries({ queryKey: ["test-orders", consultationId] });
    setShowAddPanel(false);
  };

  const handleUpdated = (updated: TestOrder) => {
    qc.setQueryData<TestOrder[]>(["test-orders", consultationId], (prev) =>
      (prev ?? []).map((o) => (o.id === updated.id ? updated : o))
    );
  };

  const handleDeleted = (id: string) => {
    qc.setQueryData<TestOrder[]>(["test-orders", consultationId], (prev) =>
      (prev ?? []).filter((o) => o.id !== id)
    );
    showToast("Test order removed", "info");
  };

  // Partition orders into three groups
  const awaitingApproval = orders.filter((o) => o.approval_status === "pending");
  const active = orders.filter((o) => o.approval_status === "approved" && !o.is_completed);
  const completed = orders.filter((o) => o.approval_status === "approved" && o.is_completed);
  const rejected = orders.filter((o) => o.approval_status === "rejected");

  // Summary badge text
  const summaryBadge = awaitingApproval.length > 0 && isDoctor
    ? { label: `${awaitingApproval.length} awaiting approval`, bg: "#fef9c3", color: "#92400e", border: "#fde68a" }
    : active.length > 0
    ? { label: `${active.length} pending`, bg: "#fef9c3", color: "#92400e", border: "#fde68a" }
    : orders.length > 0
    ? { label: "All done", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" }
    : null;

  return (
    <>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: font.md, fontWeight: 700, color: colors.text }}>
            Lab Tests
          </h2>
          {summaryBadge && (
            <span style={{
              background: summaryBadge.bg,
              color: summaryBadge.color,
              border: `1px solid ${summaryBadge.border}`,
              borderRadius: 999, padding: "1px 9px", fontSize: font.sm, fontWeight: 600,
            }}>
              {summaryBadge.label}
            </span>
          )}
        </div>

        {canAdd && !showAddPanel && (
          <button
            onClick={() => setShowAddPanel(true)}
            style={{
              padding: "5px 14px",
              background: colors.primary, color: colors.white,
              border: "none", borderRadius: radius.md,
              cursor: "pointer", fontSize: font.sm, fontWeight: 600,
            }}
          >
            + Order Tests
          </button>
        )}
      </div>

      {/* Add tests panel */}
      {showAddPanel && (
        <AddTestsPanel
          consultationId={consultationId}
          onAdded={handleAdded}
          onCancel={() => setShowAddPanel(false)}
        />
      )}

      {/* Test order list */}
      {isLoading ? (
        <div style={{ color: colors.textMuted, fontSize: font.sm, padding: "8px 0" }}>Loading…</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: colors.textMuted, fontSize: font.sm }}>
          {canAdd
            ? "No lab tests ordered yet. Click \"+ Order Tests\" to add."
            : "No lab tests were ordered for this consultation."}
        </div>
      ) : (
        <>
          {/* Awaiting approval — shown first, highlighted for doctor */}
          {awaitingApproval.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                ...sectionHeadingStyle,
                color: "#92400e",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                ⏳ Awaiting Doctor Approval
                {isDoctor && (
                  <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: colors.textMuted, fontSize: font.sm }}>
                    — review each test below
                  </span>
                )}
              </div>
              {awaitingApproval.map((o) => (
                <TestOrderRow
                  key={o.id}
                  order={o}
                  userRole={userRole}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}

          {/* Active (approved, not completed) */}
          {active.length > 0 && (
            <div style={{ marginBottom: completed.length > 0 || rejected.length > 0 ? 14 : 0 }}>
              {(awaitingApproval.length > 0) && (
                <div style={sectionHeadingStyle}>Active Tests</div>
              )}
              {active.map((o) => (
                <TestOrderRow
                  key={o.id}
                  order={o}
                  userRole={userRole}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div style={{ marginBottom: rejected.length > 0 ? 14 : 0 }}>
              {(active.length > 0 || awaitingApproval.length > 0) && (
                <div style={sectionHeadingStyle}>Completed</div>
              )}
              {completed.map((o) => (
                <TestOrderRow
                  key={o.id}
                  order={o}
                  userRole={userRole}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}

          {/* Rejected — shown at bottom, muted */}
          {rejected.length > 0 && (
            <div>
              <div style={{ ...sectionHeadingStyle, color: "#b91c1c" }}>Rejected</div>
              {rejected.map((o) => (
                <TestOrderRow
                  key={o.id}
                  order={o}
                  userRole={userRole}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
