import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { prescriptionsApi, type PendingPrescription } from "@/features/prescriptions/api/prescriptionsApi";
import PrescriptionEditForm from "@/features/prescriptions/components/PrescriptionEditForm";
import { testOrdersApi, type TestOrder } from "@/features/testOrders/api/testOrdersApi";
import { AddTestsPanel } from "@/features/testOrders/components/LabTestsSection";
import PendingTestsGroup from "@/features/testOrders/components/PendingTestsGroup";
import { useAuthStore } from "@/features/auth/store/authStore";

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

// ── Assistant-doctor: "My Submissions" view ───────────────────────────────────

function MyDraftRow({ rx }: { rx: PendingPrescription }) {
  const [expanded, setExpanded] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["prescription-detail", rx.consultation_id],
    queryFn: () => prescriptionsApi.getByConsultation(rx.consultation_id),
    enabled: expanded,
  });

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

        {/* Status badge — always "Awaiting Approval" here since we only fetch drafts */}
        <span style={{
          background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a",
          padding: "3px 10px", borderRadius: 999, fontSize: font.sm, fontWeight: 600,
        }}>
          Awaiting Doctor Approval
        </span>

        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            background: "none", border: `1px solid ${colors.border}`,
            borderRadius: radius.md, padding: "5px 14px",
            cursor: "pointer", fontSize: font.sm, color: colors.textMuted,
          }}
        >
          {expanded ? "Hide" : "View"}
        </button>
      </div>

      {/* Expanded detail (read-only) */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${colors.border}`, padding: "20px", background: colors.bg }}>
          {isLoading && (
            <p style={{ color: colors.textMuted, margin: 0, fontSize: font.sm }}>Loading…</p>
          )}
          {!isLoading && !detail && (
            <p style={{ color: colors.danger, margin: 0, fontSize: font.sm }}>Failed to load details.</p>
          )}
          {!isLoading && detail && (
            <>
              <div style={{
                fontSize: font.sm, fontWeight: 600, color: colors.textMuted,
                letterSpacing: "0.05em", marginBottom: 12,
              }}>
                PRESCRIPTION ITEMS
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
                <div style={{ marginTop: 10, fontSize: font.sm, color: colors.primary, fontWeight: 500 }}>
                  Follow-up: {detail.follow_up_date}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const APPROVAL_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pending:  { bg: "#fef9c3", color: "#92400e", border: "#fde68a", label: "Pending" },
  approved: { bg: "#dcfce7", color: "#166534", border: "#86efac", label: "Approved" },
  rejected: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5", label: "Rejected" },
};

function MyLabTestRow({ order }: { order: TestOrder }) {
  const badge = APPROVAL_BADGE[order.approval_status] ?? APPROVAL_BADGE.pending;
  return (
    <div style={{
      background: colors.white, borderRadius: radius.md, boxShadow: shadow.sm,
      padding: "14px 20px", marginBottom: 10,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: colors.text, fontSize: font.base }}>
          {order.test_name}
        </div>
        {order.lab_name && (
          <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
            {order.lab_name}
          </div>
        )}
        <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
          Patient: {order.patient_name}
        </div>
      </div>
      <span style={{
        background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
        borderRadius: 999, padding: "2px 10px", fontSize: font.sm, fontWeight: 600, whiteSpace: "nowrap",
      }}>
        {badge.label}
      </span>
    </div>
  );
}

function AssistantDraftsView() {
  const { data: myDrafts = [], isLoading } = useQuery({
    queryKey: ["my-pending-prescriptions"],
    queryFn: prescriptionsApi.listPending,
    staleTime: 0,
  });

  const { data: myLabTests = [], isLoading: loadingTests } = useQuery({
    queryKey: ["my-test-orders"],
    queryFn: testOrdersApi.listMine,
    staleTime: 0,
  });

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        {/* Prescriptions section */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>
              My Prescriptions
            </h1>
            {myDrafts.length > 0 && (
              <span style={{
                background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a",
                borderRadius: 999, padding: "2px 9px", fontSize: font.sm, fontWeight: 700,
              }}>
                {myDrafts.length} pending
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
            Prescriptions you've submitted, awaiting doctor approval
          </p>
        </div>

        {isLoading && <p style={{ color: colors.textMuted }}>Loading…</p>}

        {!isLoading && myDrafts.length === 0 && (
          <div style={{
            background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm,
            padding: "56px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💊</div>
            <div style={{ fontWeight: 600, color: colors.text, marginBottom: 4 }}>
              No pending prescriptions
            </div>
            <div style={{ color: colors.textMuted, fontSize: font.sm }}>
              Prescriptions you draft during consultations will appear here for doctor review.
            </div>
          </div>
        )}

        {myDrafts.map((rx) => (
          <MyDraftRow key={rx.prescription_id} rx={rx} />
        ))}

        {/* Lab tests section */}
        <div style={{ marginTop: 40, marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: font.lg, fontWeight: 700, color: colors.text }}>
            My Lab Tests
          </h2>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
            Lab test orders you've submitted and their approval status
          </p>
        </div>

        {loadingTests && <p style={{ color: colors.textMuted }}>Loading…</p>}

        {!loadingTests && myLabTests.length === 0 && (
          <div style={{
            background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm,
            padding: "40px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🧪</div>
            <div style={{ fontWeight: 600, color: colors.text, marginBottom: 4 }}>
              No lab test orders
            </div>
            <div style={{ color: colors.textMuted, fontSize: font.sm }}>
              Lab tests you order during consultations will appear here.
            </div>
          </div>
        )}

        {myLabTests.map((order) => (
          <MyLabTestRow key={order.id} order={order} />
        ))}
      </div>
    </AppShell>
  );
}

// ── Doctor: approvals view ────────────────────────────────────────────────────

function DoctorApprovalsView() {
  const qc = useQueryClient();

  const { data: pendingRx, isLoading: loadingRx } = useQuery({
    queryKey: ["pending-prescriptions"],
    queryFn: prescriptionsApi.listPending,
    staleTime: 0,
  });

  const { data: pendingTests, isLoading: loadingTests } = useQuery({
    queryKey: ["pending-test-orders"],
    queryFn: testOrdersApi.listPending,
    staleTime: 0,
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

// ── Page — role router ────────────────────────────────────────────────────────

export default function PrescriptionsPage() {
  const user = useAuthStore((s) => s.user);
  return user?.role === "assistant_doctor"
    ? <AssistantDraftsView />
    : <DoctorApprovalsView />;
}
