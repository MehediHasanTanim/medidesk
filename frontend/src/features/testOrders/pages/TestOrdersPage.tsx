import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { testOrdersApi, type TestOrder } from "@/features/testOrders/api/testOrdersApi";
import PendingTestsGroup from "@/features/testOrders/components/PendingTestsGroup";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Group flat pending-order list by consultation_id */
function groupByConsultation(orders: TestOrder[]) {
  const map = new Map<
    string,
    { patientName: string; orderedByName: string; orderedAt: string | null; orders: TestOrder[] }
  >();

  for (const o of orders) {
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

  return Array.from(map.entries()).map(([consultationId, g]) => ({
    consultationId,
    ...g,
  }));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TestOrdersPage() {
  const qc = useQueryClient();

  const { data: pendingTests = [], isLoading } = useQuery<TestOrder[]>({
    queryKey: ["pending-test-orders"],
    queryFn: testOrdersApi.listPending,
  });

  const groups = groupByConsultation(pendingTests);

  const handleChanged = () =>
    qc.invalidateQueries({ queryKey: ["pending-test-orders"] });

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>
              Lab Test Approvals
            </h1>
            {pendingTests.length > 0 && (
              <span style={{
                background: colors.danger, color: colors.white,
                borderRadius: 999, padding: "2px 10px",
                fontSize: font.sm, fontWeight: 700,
              }}>
                {pendingTests.length}
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
            Review and approve lab tests ordered by assistant doctors
          </p>
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <p style={{ color: colors.textMuted }}>Loading…</p>
        )}

        {/* ── Empty state ── */}
        {!isLoading && groups.length === 0 && (
          <div style={{
            background: colors.white, borderRadius: radius.lg,
            boxShadow: shadow.sm, padding: "56px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧪</div>
            <div style={{ fontWeight: 600, color: colors.text, marginBottom: 4 }}>
              No pending lab tests
            </div>
            <div style={{ color: colors.textMuted, fontSize: font.sm }}>
              Lab tests ordered by assistant doctors will appear here for your approval.
            </div>
          </div>
        )}

        {/* ── Groups ── */}
        {groups.map((g) => (
          <PendingTestsGroup
            key={g.consultationId}
            consultationId={g.consultationId}
            patientName={g.patientName}
            orderedByName={g.orderedByName}
            orderedAt={g.orderedAt}
            orders={g.orders}
            onChanged={handleChanged}
          />
        ))}
      </div>
    </AppShell>
  );
}
