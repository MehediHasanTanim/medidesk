import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { prescriptionsApi, type PendingPrescription } from "@/features/prescriptions/api/prescriptionsApi";

function PrescriptionRow({ rx, onApprove }: { rx: PendingPrescription; onApprove: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["prescription-detail", rx.consultation_id],
    queryFn: () => prescriptionsApi.getByConsultation(rx.consultation_id),
    enabled: expanded,
  });

  return (
    <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, marginBottom: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}>
            {rx.item_count} medication{rx.item_count !== 1 ? "s" : ""}
          </div>
          <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2, fontFamily: "monospace" }}>
            Patient: {rx.patient_id}
            {rx.follow_up_date && (
              <span style={{ fontFamily: "inherit" }}> · Follow-up: {rx.follow_up_date}</span>
            )}
            {rx.created_at && (
              <span style={{ fontFamily: "inherit" }}> · {new Date(rx.created_at).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })}</span>
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
          onClick={() => setExpanded((e) => !e)}
          style={{ background: "none", border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: "5px 14px", cursor: "pointer", fontSize: font.sm, color: colors.textMuted }}
        >
          {expanded ? "Hide" : "Review"}
        </button>

        <button
          onClick={() => onApprove(rx.prescription_id)}
          style={{ background: colors.success, color: colors.white, border: "none", borderRadius: radius.md, padding: "6px 16px", cursor: "pointer", fontSize: font.sm, fontWeight: 600 }}
        >
          Approve
        </button>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${colors.border}`, padding: "16px 20px", background: colors.bg }}>
          {isLoading ? (
            <p style={{ color: colors.textMuted, margin: 0, fontSize: font.sm }}>Loading prescription…</p>
          ) : detail ? (
            <div>
              <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 10, letterSpacing: "0.05em" }}>
                PRESCRIPTION ITEMS
              </div>
              {detail.items.map((item, i) => (
                <div
                  key={i}
                  style={{ background: colors.white, borderRadius: radius.md, padding: "10px 14px", marginBottom: 8, border: `1px solid ${colors.border}` }}
                >
                  <div style={{ fontWeight: 600, color: colors.text, fontSize: font.base }}>{item.medicine_name}</div>
                  <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
                    {item.dosage} · {item.route}
                    {item.instructions && ` · ${item.instructions}`}
                  </div>
                </div>
              ))}
              {detail.follow_up_date && (
                <div style={{ marginTop: 10, fontSize: font.sm, color: colors.primary, fontWeight: 500 }}>
                  Follow-up: {detail.follow_up_date}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: colors.danger, margin: 0, fontSize: font.sm }}>Failed to load details.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PrescriptionsPage() {
  const qc = useQueryClient();

  const { data: pending, isLoading } = useQuery({
    queryKey: ["pending-prescriptions"],
    queryFn: prescriptionsApi.listPending,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => prescriptionsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-prescriptions"] }),
  });

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>
              Prescription Approvals
            </h1>
            {(pending?.length ?? 0) > 0 && (
              <span style={{
                background: colors.danger, color: colors.white,
                borderRadius: 999, padding: "2px 9px", fontSize: font.sm, fontWeight: 700,
              }}>
                {pending!.length}
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
            Review and approve prescriptions drafted by assistant doctors
          </p>
        </div>

        {isLoading && <p style={{ color: colors.textMuted }}>Loading…</p>}

        {!isLoading && (pending?.length ?? 0) === 0 && (
          <div style={{
            background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm,
            padding: "56px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontWeight: 600, color: colors.text, marginBottom: 4 }}>All caught up!</div>
            <div style={{ color: colors.textMuted, fontSize: font.sm }}>No pending prescriptions to review.</div>
          </div>
        )}

        {pending?.map((rx) => (
          <PrescriptionRow
            key={rx.prescription_id}
            rx={rx}
            onApprove={(id) => approveMutation.mutate(id)}
          />
        ))}
      </div>
    </AppShell>
  );
}
