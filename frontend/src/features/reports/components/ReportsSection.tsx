import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { colors, font, radius } from "@/shared/styles/theme";
import Toast, { useToast } from "@/shared/components/Toast";
import {
  reportsApi,
  viewReport,
  downloadReport,
  REPORT_CATEGORY_LABELS,
  REPORT_CATEGORY_ICONS,
  type ReportCategory,
  type ReportResponse,
} from "@/features/reports/api/reportsApi";
import { testOrdersApi, type TestOrder } from "@/features/testOrders/api/testOrdersApi";

// ── Styles ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: font.sm,
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: 4,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 11px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  fontSize: font.base,
  color: colors.text,
  background: colors.white,
  boxSizing: "border-box" as const,
  outline: "none",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  color: colors.textMuted,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginBottom: 8,
};

const UPLOAD_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: "blood_test", label: "Blood Test" },
  { value: "imaging", label: "Imaging" },
  { value: "biopsy", label: "Biopsy" },
  { value: "other", label: "Other" },
];

// ── Upload panel ──────────────────────────────────────────────────────────────

function UploadPanel({
  patientId,
  consultationId,
  testOrders,
  onUploaded,
  onCancel,
}: {
  patientId: string;
  consultationId: string;
  testOrders: TestOrder[];
  onUploaded: () => void;
  onCancel: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<ReportCategory>("blood_test");
  const [notes, setNotes] = useState("");
  const [testOrderId, setTestOrderId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const approvedOrders = testOrders.filter((o) => o.approval_status === "approved");

  const mutation = useMutation({
    mutationFn: () =>
      reportsApi.upload({
        patient_id: patientId,
        file: file!,
        category,
        consultation_id: consultationId,
        test_order_id: testOrderId || undefined,
        notes: notes || undefined,
      }),
    onSuccess: onUploaded,
    onError: (e: any) => setError(e?.response?.data?.error ?? "Upload failed"),
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      background: "#f8fafc",
      padding: 20,
      marginTop: 12,
    }}>
      {error && (
        <div style={{ background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", borderRadius: radius.md, padding: "8px 12px", marginBottom: 12, fontSize: font.sm }}>
          {error}
        </div>
      )}

      {/* Drop zone */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>File</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) { setFile(f); setError(""); }
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? colors.primary : colors.border}`,
            borderRadius: radius.md,
            padding: "20px 16px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? colors.primaryLight : colors.white,
            transition: "all 0.15s",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setFile(f); setError(""); }
            }}
          />
          {file ? (
            <div>
              <div style={{ fontSize: "22px", marginBottom: 4 }}>📄</div>
              <div style={{ fontWeight: 600, color: colors.text, fontSize: font.sm }}>{file.name}</div>
              <div style={{ color: colors.textMuted, fontSize: "12px", marginTop: 2 }}>{formatBytes(file.size)}</div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                style={{ marginTop: 6, background: "none", border: "none", color: colors.danger, cursor: "pointer", fontSize: font.sm }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "24px", marginBottom: 4 }}>📁</div>
              <div style={{ color: colors.text, fontSize: font.sm, fontWeight: 500 }}>
                Drag & drop or <span style={{ color: colors.primary }}>browse</span>
              </div>
              <div style={{ color: colors.textMuted, fontSize: "12px", marginTop: 3 }}>PDF, JPG, PNG</div>
            </div>
          )}
        </div>
      </div>

      {/* Category + test order link in a 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: approvedOrders.length > 0 ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Category</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {UPLOAD_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                style={{
                  padding: "4px 12px",
                  border: `1.5px solid ${category === cat.value ? colors.primary : colors.border}`,
                  borderRadius: 999,
                  background: category === cat.value ? colors.primaryLight : colors.white,
                  color: category === cat.value ? colors.primary : colors.textMuted,
                  cursor: "pointer",
                  fontSize: font.sm,
                  fontWeight: category === cat.value ? 600 : 400,
                  transition: "all 0.12s",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {approvedOrders.length > 0 && (
          <div>
            <label style={labelStyle}>Link to Test Order (optional)</label>
            <select
              value={testOrderId}
              onChange={(e) => setTestOrderId(e.target.value)}
              style={{ ...inputStyle, background: colors.white }}
            >
              <option value="">— None —</option>
              {approvedOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.test_name}{o.lab_name ? ` — ${o.lab_name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Notes <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
        <input
          style={inputStyle}
          placeholder="Result summary, reference range, findings…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{ padding: "7px 18px", background: colors.white, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}
        >
          Cancel
        </button>
        <button
          onClick={() => { setError(""); if (!file) { setError("Select a file"); return; } mutation.mutate(); }}
          disabled={!file || mutation.isPending}
          style={{
            padding: "7px 20px",
            background: !file ? colors.border : colors.primary,
            color: colors.white,
            border: "none",
            borderRadius: radius.md,
            cursor: !file ? "not-allowed" : "pointer",
            fontSize: font.base,
            fontWeight: 600,
            opacity: mutation.isPending ? 0.7 : 1,
          }}
        >
          {mutation.isPending ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}

// ── Report row ────────────────────────────────────────────────────────────────

function ReportRow({
  report,
  canDelete,
  onDeleted,
}: {
  report: ReportResponse;
  canDelete: boolean;
  onDeleted: (id: string) => void;
}) {
  const { show: showToast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: () => reportsApi.delete(report.id),
    onSuccess: () => { onDeleted(report.id); showToast("Report deleted", "info"); },
    onError: () => showToast("Failed to delete report", "error"),
  });

  const cat = report.category as ReportCategory;
  const icon = REPORT_CATEGORY_ICONS[cat] ?? "📄";
  const label = REPORT_CATEGORY_LABELS[cat] ?? cat;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      borderRadius: radius.md,
      marginBottom: 8,
      background: colors.white,
      border: `1px solid ${colors.border}`,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: colors.text, fontSize: font.base, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={report.original_filename}>
          {report.original_filename}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", marginTop: 3 }}>
          <span style={{ fontSize: font.sm, color: colors.textMuted }}>
            {new Date(report.uploaded_at).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {report.uploaded_by_name && (
            <span style={{ fontSize: font.sm, color: colors.textMuted }}>by {report.uploaded_by_name}</span>
          )}
          {report.notes && (
            <span style={{ fontSize: font.sm, color: colors.textMuted, fontStyle: "italic" }}>{report.notes}</span>
          )}
        </div>
      </div>

      {/* Category badge */}
      <span style={{
        flexShrink: 0,
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: "11px",
        fontWeight: 700,
        background: "#f0fdf4",
        color: "#15803d",
        border: "1px solid #bbf7d0",
      }}>
        {label}
      </span>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => viewReport(report.id)}
          title="View inline"
          style={{
            padding: "4px 12px",
            background: colors.primaryLight,
            color: colors.primary,
            border: `1px solid #bfdbfe`,
            borderRadius: radius.md,
            cursor: "pointer",
            fontSize: font.sm,
            fontWeight: 600,
          }}
        >
          View
        </button>
        <button
          onClick={() => downloadReport(report.id, report.original_filename)}
          title="Download"
          style={{
            padding: "4px 12px",
            background: colors.white,
            color: colors.textMuted,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            cursor: "pointer",
            fontSize: font.sm,
            fontWeight: 600,
          }}
        >
          ↓
        </button>
        {canDelete && (
          <button
            onClick={() => { if (confirm(`Delete "${report.original_filename}"?`)) deleteMutation.mutate(); }}
            disabled={deleteMutation.isPending}
            title="Delete report"
            style={{
              padding: "4px 8px",
              background: "none",
              color: colors.textMuted,
              border: "none",
              borderRadius: radius.md,
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  consultationId: string;
  patientId: string;
  userRole: string;
}

const CLINICAL_ROLES = new Set(["doctor", "assistant_doctor"]);

export default function ReportsSection({ consultationId, patientId, userRole }: Props) {
  const qc = useQueryClient();
  const { toast, show: showToast, dismiss } = useToast();
  const [showUpload, setShowUpload] = useState(false);

  const canUpload = CLINICAL_ROLES.has(userRole);
  const canDelete = CLINICAL_ROLES.has(userRole);

  const { data: reports = [], isLoading } = useQuery<ReportResponse[]>({
    queryKey: ["reports", patientId, consultationId],
    queryFn: () => reportsApi.list({ patient_id: patientId, consultation_id: consultationId }),
    staleTime: 0,
  });

  const { data: testOrders = [] } = useQuery<TestOrder[]>({
    queryKey: ["test-orders", consultationId],
    queryFn: () => testOrdersApi.listByConsultation(consultationId),
    staleTime: 60_000,
    enabled: canUpload,
  });

  const handleUploaded = () => {
    qc.invalidateQueries({ queryKey: ["reports", patientId, consultationId] });
    setShowUpload(false);
    showToast("Report uploaded", "success");
  };

  const handleDeleted = (id: string) => {
    qc.setQueryData<ReportResponse[]>(["reports", patientId, consultationId], (prev) =>
      (prev ?? []).filter((r) => r.id !== id)
    );
  };

  const summaryBadge = reports.length > 0
    ? { label: `${reports.length} report${reports.length !== 1 ? "s" : ""}`, bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" }
    : null;

  return (
    <>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: font.md, fontWeight: 700, color: colors.text }}>
            Reports
          </h2>
          {summaryBadge && (
            <span style={{
              background: summaryBadge.bg,
              color: summaryBadge.color,
              border: `1px solid ${summaryBadge.border}`,
              borderRadius: 999,
              padding: "1px 9px",
              fontSize: font.sm,
              fontWeight: 600,
            }}>
              {summaryBadge.label}
            </span>
          )}
        </div>
        {canUpload && !showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            style={{
              padding: "5px 14px",
              background: colors.primary,
              color: colors.white,
              border: "none",
              borderRadius: radius.md,
              cursor: "pointer",
              fontSize: font.sm,
              fontWeight: 600,
            }}
          >
            + Upload Report
          </button>
        )}
      </div>

      {/* Upload panel */}
      {showUpload && (
        <UploadPanel
          patientId={patientId}
          consultationId={consultationId}
          testOrders={testOrders}
          onUploaded={handleUploaded}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {/* Report list */}
      {isLoading ? (
        <div style={{ color: colors.textMuted, fontSize: font.sm, padding: "8px 0" }}>Loading…</div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: colors.textMuted, fontSize: font.sm }}>
          {canUpload
            ? "No reports uploaded yet for this consultation."
            : "No reports were uploaded for this consultation."}
        </div>
      ) : (
        <>
          {/* Group by test order if any reports are linked */}
          {(() => {
            const linked = reports.filter((r) => r.test_order_id);
            const unlinked = reports.filter((r) => !r.test_order_id);

            if (linked.length === 0) {
              return reports.map((r) => (
                <ReportRow key={r.id} report={r} canDelete={canDelete} onDeleted={handleDeleted} />
              ));
            }

            const byTestOrder = new Map<string, ReportResponse[]>();
            for (const r of linked) {
              const key = r.test_order_id!;
              if (!byTestOrder.has(key)) byTestOrder.set(key, []);
              byTestOrder.get(key)!.push(r);
            }

            const testOrderMap = new Map(testOrders.map((o) => [o.id, o]));

            return (
              <>
                {Array.from(byTestOrder.entries()).map(([orderId, orderReports]) => {
                  const order = testOrderMap.get(orderId);
                  return (
                    <div key={orderId} style={{ marginBottom: 12 }}>
                      <div style={{ ...sectionHeadingStyle, color: colors.primary }}>
                        🧪 {order ? order.test_name : "Lab Test"}
                        {order?.lab_name && <span style={{ fontWeight: 400, marginLeft: 6, color: colors.textMuted }}>— {order.lab_name}</span>}
                      </div>
                      {orderReports.map((r) => (
                        <ReportRow key={r.id} report={r} canDelete={canDelete} onDeleted={handleDeleted} />
                      ))}
                    </div>
                  );
                })}
                {unlinked.length > 0 && (
                  <div>
                    {linked.length > 0 && <div style={sectionHeadingStyle}>Other Reports</div>}
                    {unlinked.map((r) => (
                      <ReportRow key={r.id} report={r} canDelete={canDelete} onDeleted={handleDeleted} />
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </>
  );
}
