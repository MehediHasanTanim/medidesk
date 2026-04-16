import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { colors, font, radius } from "@/shared/styles/theme";
import Toast, { useToast } from "@/shared/components/Toast";
import {
  prescriptionsApi,
  type PrescriptionDetail,
  type PrescriptionItemPayload,
} from "../api/prescriptionsApi";
import MedicineSearchInput from "./MedicineSearchInput";
import type { MedicineSearchResult } from "@/features/medicines/api/medicinesApi";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DraftItem extends PrescriptionItemPayload {
  _key: number;
}

// ── Shared inline styles ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
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

const ROUTES = [
  "oral", "sublingual", "topical", "inhaled",
  "iv", "im", "sc", "rectal", "nasal", "ophthalmic",
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  rx: PrescriptionDetail;
  /** Called after a successful save-only (prescription stays draft). */
  onSaved: () => void;
  /** Called after a successful save+approve. */
  onSavedAndApproved: () => void;
  onCancel: () => void;
}

export default function PrescriptionEditForm({
  rx,
  onSaved,
  onSavedAndApproved,
  onCancel,
}: Props) {
  const { toast, show: showToast, dismiss } = useToast();

  // Pre-populate items from the existing prescription
  const [items, setItems] = useState<DraftItem[]>(() =>
    rx.items.map((item, i) => ({
      _key: i,
      medicine_id: item.medicine_id,
      medicine_name: item.medicine_name,
      morning: item.morning,
      afternoon: item.afternoon,
      evening: item.evening,
      duration_days: item.duration_days,
      route: item.route,
      instructions: item.instructions,
    }))
  );
  const [followUpDate, setFollowUpDate] = useState(rx.follow_up_date ?? "");
  const [editingItem, setEditingItem] = useState<Partial<DraftItem> | null>(null);
  const [error, setError] = useState("");
  const keyRef = useRef(rx.items.length);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const buildPayload = () => ({
    items: items.map(({ _key, ...rest }) => rest),
    follow_up_date: followUpDate || null,
  });

  const updateMutation = useMutation({
    mutationFn: () => prescriptionsApi.update(rx.prescription_id, buildPayload()),
    onSuccess: () => {
      showToast("Prescription updated", "success");
      onSaved();
    },
    onError: (e: any) =>
      setError(e.response?.data?.error ?? "Failed to update prescription"),
  });

  const updateAndApproveMutation = useMutation({
    mutationFn: async () => {
      await prescriptionsApi.update(rx.prescription_id, buildPayload());
      await prescriptionsApi.approve(rx.prescription_id);
    },
    onSuccess: () => {
      showToast("Prescription approved", "success");
      onSavedAndApproved();
    },
    onError: (e: any) =>
      setError(e.response?.data?.error ?? "Failed to update / approve prescription"),
  });

  const isPending = updateMutation.isPending || updateAndApproveMutation.isPending;

  // ── Item editing handlers ───────────────────────────────────────────────────

  const handleSelectMedicine = (m: MedicineSearchResult) => {
    setEditingItem({
      _key: ++keyRef.current,
      medicine_id: m.id,
      medicine_name: `${m.brand_name} ${m.strength}`,
      morning: "",
      afternoon: "",
      evening: "",
      duration_days: 7,
      route: "oral",
      instructions: "",
    });
  };

  const handleAddItem = () => {
    if (!editingItem) return;
    if (!editingItem.medicine_id) return setError("Select a medicine");
    if (!editingItem.morning && !editingItem.afternoon && !editingItem.evening)
      return setError("Enter at least one dosage (morning / afternoon / evening)");
    const normalised: DraftItem = {
      ...(editingItem as DraftItem),
      morning: editingItem.morning || "0",
      afternoon: editingItem.afternoon || "0",
      evening: editingItem.evening || "0",
    };
    setItems((prev) => [...prev, normalised]);
    setEditingItem(null);
    setError("");
  };

  const handleSubmit = (andApprove: boolean) => {
    setError("");
    if (items.length === 0) return setError("Add at least one medicine");
    if (andApprove) updateAndApproveMutation.mutate();
    else updateMutation.mutate();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: colors.text, fontSize: font.lg }}>
          Edit Prescription
        </div>
        <button
          onClick={onCancel}
          disabled={isPending}
          style={{
            background: "none", border: `1px solid ${colors.border}`,
            borderRadius: radius.md, padding: "5px 14px",
            cursor: "pointer", fontSize: font.sm, color: colors.textMuted,
          }}
        >
          Cancel
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca",
          borderRadius: radius.md, padding: "8px 12px", marginBottom: 12, fontSize: font.sm,
        }}>
          {error}
        </div>
      )}

      {/* Medicine search */}
      <div style={{ marginBottom: 16 }}>
        <MedicineSearchInput onSelect={handleSelectMedicine} />
      </div>

      {/* Item editor — shown after selecting a medicine */}
      {editingItem && (
        <div style={{
          background: colors.primaryLight, border: "1px solid #bfdbfe",
          borderRadius: radius.md, padding: 16, marginBottom: 16,
        }}>
          <div style={{ fontWeight: 600, color: colors.text, marginBottom: 12, fontSize: font.base }}>
            {editingItem.medicine_name}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Morning</label>
              <input type="text" placeholder="e.g. 1" style={inputStyle}
                value={editingItem.morning ?? ""}
                onChange={(e) => setEditingItem((f) => ({ ...f!, morning: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Afternoon</label>
              <input type="text" placeholder="e.g. 0" style={inputStyle}
                value={editingItem.afternoon ?? ""}
                onChange={(e) => setEditingItem((f) => ({ ...f!, afternoon: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Evening</label>
              <input type="text" placeholder="e.g. 1" style={inputStyle}
                value={editingItem.evening ?? ""}
                onChange={(e) => setEditingItem((f) => ({ ...f!, evening: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Duration (days)</label>
              <input type="number" min={1} style={inputStyle}
                value={editingItem.duration_days ?? 7}
                onChange={(e) => setEditingItem((f) => ({ ...f!, duration_days: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Route</label>
              <select style={{ ...inputStyle, background: colors.white }}
                value={editingItem.route ?? "oral"}
                onChange={(e) => setEditingItem((f) => ({ ...f!, route: e.target.value }))}>
                {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Instructions</label>
              <input type="text" placeholder="e.g. After meal, with water" style={inputStyle}
                value={editingItem.instructions ?? ""}
                onChange={(e) => setEditingItem((f) => ({ ...f!, instructions: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setEditingItem(null)}
              style={{
                padding: "6px 16px", background: colors.white,
                border: `1px solid ${colors.border}`, borderRadius: radius.md,
                cursor: "pointer", fontSize: font.sm,
              }}>
              Cancel
            </button>
            <button onClick={handleAddItem}
              style={{
                padding: "6px 16px", background: colors.primary, color: colors.white,
                border: "none", borderRadius: radius.md,
                cursor: "pointer", fontSize: font.sm, fontWeight: 600,
              }}>
              Add to Prescription
            </button>
          </div>
        </div>
      )}

      {/* Current items list */}
      {items.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: font.sm, fontWeight: 600, color: colors.textMuted,
            marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            Items ({items.length})
          </div>
          {items.map((item) => (
            <div key={item._key} style={{
              display: "flex", alignItems: "center",
              background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: radius.md, padding: "8px 12px", marginBottom: 6,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: colors.text, fontSize: font.base }}>
                  {item.medicine_name}
                </div>
                <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
                  {item.morning || "0"}+{item.afternoon || "0"}+{item.evening || "0"} × {item.duration_days} days
                  {" · "}{item.route}
                  {item.instructions && ` · ${item.instructions}`}
                </div>
              </div>
              <button
                onClick={() => setItems((prev) => prev.filter((i) => i._key !== item._key))}
                title="Remove"
                style={{
                  background: "none", border: "none", color: colors.danger,
                  cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "0 6px",
                  opacity: 0.7,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Follow-up date + action buttons */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        alignItems: "flex-end",
        gap: 10,
        paddingTop: 4,
      }}>
        <div>
          <label style={labelStyle}>Follow-up Date (optional)</label>
          <input
            type="date"
            style={inputStyle}
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </div>

        {/* Save only — prescription stays draft */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={isPending || items.length === 0}
          style={{
            padding: "9px 18px",
            background: colors.white,
            border: `1px solid ${colors.primary}`,
            color: colors.primary,
            borderRadius: radius.md,
            cursor: isPending || items.length === 0 ? "not-allowed" : "pointer",
            fontSize: font.sm,
            fontWeight: 600,
            opacity: items.length === 0 ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {updateMutation.isPending ? "Saving…" : "Save Changes"}
        </button>

        {/* Save + approve in one step */}
        <button
          onClick={() => handleSubmit(true)}
          disabled={isPending || items.length === 0}
          style={{
            padding: "9px 18px",
            background: colors.success,
            color: colors.white,
            border: "none",
            borderRadius: radius.md,
            cursor: isPending || items.length === 0 ? "not-allowed" : "pointer",
            fontSize: font.sm,
            fontWeight: 600,
            opacity: items.length === 0 ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {updateAndApproveMutation.isPending ? "Approving…" : "Save & Approve"}
        </button>
      </div>
    </>
  );
}
