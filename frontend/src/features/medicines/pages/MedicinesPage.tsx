import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import Toast, { useToast } from "@/shared/components/Toast";
import { useAuthStore } from "@/features/auth/store/authStore";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import {
  medicinesApi,
  MEDICINE_FORMS,
  MEDICINE_FORM_LABELS,
  type GenericMedicine,
  type BrandMedicine,
  type Manufacturer,
  type CreateGenericPayload,
  type UpdateGenericPayload,
  type CreateBrandPayload,
  type UpdateBrandPayload,
  type CreateManufacturerPayload,
  type UpdateManufacturerPayload,
} from "@/features/medicines/api/medicinesApi";

// ── Shared styles ─────────────────────────────────────────────────────────────

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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 72,
  fontFamily: "inherit",
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: font.sm,
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: font.sm,
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: `2px solid ${colors.border}`,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: font.base,
  color: colors.text,
  borderBottom: `1px solid ${colors.border}`,
  verticalAlign: "middle",
};

// ── Form colour pill ──────────────────────────────────────────────────────────

const FORM_COLORS: Record<string, { bg: string; color: string }> = {
  tablet:                { bg: "#eff6ff", color: "#1d4ed8" },
  capsule:               { bg: "#f0fdf4", color: "#166534" },
  syrup:                 { bg: "#fef9c3", color: "#92400e" },
  injection:             { bg: "#fdf2f8", color: "#9d174d" },
  cream:                 { bg: "#fff7ed", color: "#c2410c" },
  drops:                 { bg: "#f0fdfa", color: "#0f766e" },
  inhaler:               { bg: "#faf5ff", color: "#7e22ce" },
  powder_for_suspension: { bg: "#fefce8", color: "#a16207" },
  solution:              { bg: "#ecfeff", color: "#0e7490" },
  gel:                   { bg: "#f0fdf4", color: "#15803d" },
  ointment:              { bg: "#fff7ed", color: "#9a3412" },
  suppository:           { bg: "#fdf4ff", color: "#86198f" },
  patch:                 { bg: "#f1f5f9", color: "#475569" },
  spray:                 { bg: "#ecfeff", color: "#0891b2" },
  lotion:                { bg: "#fef3c7", color: "#b45309" },
  powder:                { bg: "#f8fafc", color: "#64748b" },
  granules:              { bg: "#fefce8", color: "#854d0e" },
  other:                 { bg: "#f9fafb", color: "#374151" },
};

function FormPill({ form }: { form: string }) {
  const s = FORM_COLORS[form] ?? FORM_COLORS.other;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 999, padding: "2px 10px", fontSize: font.sm, fontWeight: 600, whiteSpace: "nowrap" }}>
      {MEDICINE_FORM_LABELS[form] ?? form}
    </span>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────

function ErrBanner({ msg }: { msg: string }) {
  return (
    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 14px", borderRadius: radius.md, marginBottom: 16, fontSize: font.sm }}>
      {msg}
    </div>
  );
}

// ── Row action buttons ────────────────────────────────────────────────────────

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "4px 12px", background: "#eff6ff", color: colors.primary, border: "1px solid #bfdbfe", borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}>
      Edit
    </button>
  );
}

// ── Section divider for modals ────────────────────────────────────────────────

function SectionHeading({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 14px" }}>
      <span style={{ fontSize: font.sm, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: colors.border }} />
    </div>
  );
}

// ── Manufacturer modal ────────────────────────────────────────────────────────

function ManufacturerModal({
  manufacturer,
  onClose,
  onSaved,
}: {
  manufacturer?: Manufacturer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateManufacturerPayload>({
    name: manufacturer?.name ?? "",
    country: manufacturer?.country ?? "Bangladesh",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data: CreateManufacturerPayload | UpdateManufacturerPayload) =>
      manufacturer
        ? medicinesApi.updateManufacturer(manufacturer.id, data)
        : medicinesApi.createManufacturer(data as CreateManufacturerPayload),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to save"),
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, padding: 32, width: 460, boxShadow: shadow.lg }}>
        <h3 style={{ margin: "0 0 20px", fontSize: font.lg, fontWeight: 700, color: colors.text }}>
          {manufacturer ? "Edit Manufacturer" : "Add Manufacturer"}
        </h3>

        {error && <ErrBanner msg={error} />}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Company Name *</label>
          <input style={inputStyle} placeholder="e.g. Beximco Pharmaceuticals" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Country</label>
          <input style={inputStyle} placeholder="e.g. Bangladesh" value={form.country ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}>Cancel</button>
          <button
            onClick={() => { setError(""); if (!form.name.trim()) { setError("Company name is required"); return; } mutation.mutate(form); }}
            disabled={mutation.isPending}
            style={{ padding: "8px 22px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600, opacity: mutation.isPending ? 0.7 : 1 }}>
            {mutation.isPending ? "Saving…" : manufacturer ? "Save Changes" : "Add Manufacturer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generic medicine modal ────────────────────────────────────────────────────

function GenericModal({
  generic,
  onClose,
  onSaved,
}: {
  generic?: GenericMedicine;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateGenericPayload>({
    generic_name:    generic?.generic_name    ?? "",
    drug_class:      generic?.drug_class      ?? "",
    therapeutic_class: generic?.therapeutic_class ?? "",
    indications:     generic?.indications     ?? "",
    dosage_info:     generic?.dosage_info     ?? "",
    administration:  generic?.administration  ?? "",
    contraindications: generic?.contraindications ?? [],
    side_effects:    generic?.side_effects    ?? "",
    drug_interactions: generic?.drug_interactions ?? "",
    storage:         generic?.storage         ?? "",
    pregnancy_notes: generic?.pregnancy_notes ?? "",
    precautions:     generic?.precautions     ?? "",
    mode_of_action:  generic?.mode_of_action  ?? "",
  });
  const [contraInput, setContraInput] = useState("");
  const [error, setError] = useState("");

  const s = (key: keyof CreateGenericPayload) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const mutation = useMutation({
    mutationFn: (data: CreateGenericPayload | UpdateGenericPayload) =>
      generic
        ? medicinesApi.updateGeneric(generic.id, data)
        : medicinesApi.createGeneric(data as CreateGenericPayload),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to save"),
  });

  const addContra = () => {
    const val = contraInput.trim();
    if (val && !form.contraindications?.includes(val)) {
      setForm((f) => ({ ...f, contraindications: [...(f.contraindications ?? []), val] }));
    }
    setContraInput("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, padding: 32, width: "min(660px, 96vw)", maxHeight: "92vh", overflowY: "auto", boxShadow: shadow.lg }}>
        <h3 style={{ margin: "0 0 4px", fontSize: font.lg, fontWeight: 700, color: colors.text }}>
          {generic ? "Edit Generic Medicine" : "Add Generic Medicine"}
        </h3>
        <p style={{ margin: "0 0 18px", fontSize: font.sm, color: colors.textMuted }}>
          Clinical info is shared across all brands of this generic.
        </p>

        {error && <ErrBanner msg={error} />}

        {/* ── Basic identity ─────────────────────────────────────── */}
        <SectionHeading label="Basic Info" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Generic Name *</label>
            <input style={inputStyle} placeholder="e.g. Phenoxymethyl Penicillin" value={form.generic_name}
              onChange={(e) => s("generic_name")(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Drug Class *</label>
            <input style={inputStyle} placeholder="e.g. Penicillin Antibiotics" value={form.drug_class}
              onChange={(e) => s("drug_class")(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Therapeutic Class</label>
          <input style={inputStyle} placeholder="e.g. Benzylpenicillin & Phenoxymethyl penicillin" value={form.therapeutic_class}
            onChange={(e) => s("therapeutic_class")(e.target.value)} />
        </div>

        {/* ── Clinical information ───────────────────────────────── */}
        <SectionHeading label="Clinical Information" />

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Indications</label>
          <textarea style={textareaStyle} placeholder="What conditions / infections does this treat?" value={form.indications}
            onChange={(e) => s("indications")(e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Dosage Guidelines</label>
            <textarea style={{ ...textareaStyle, minHeight: 88 }}
              placeholder={"Adults: 250–500 mg every 6 hrs\nChildren: 125–250 mg every 6 hrs"}
              value={form.dosage_info} onChange={(e) => s("dosage_info")(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Administration</label>
            <textarea style={{ ...textareaStyle, minHeight: 88 }}
              placeholder="e.g. Take on an empty stomach, 1 hour before meals"
              value={form.administration} onChange={(e) => s("administration")(e.target.value)} />
          </div>
        </div>

        {/* Contraindications tag input */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Contraindications</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Type a contraindication and press Add or Enter…"
              value={contraInput}
              onChange={(e) => setContraInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addContra(); } }}
            />
            <button type="button" onClick={addContra}
              style={{ padding: "8px 16px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.sm, fontWeight: 600, flexShrink: 0 }}>
              Add
            </button>
          </div>
          {(form.contraindications ?? []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(form.contraindications ?? []).map((c) => (
                <span key={c} style={{ background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a", borderRadius: 999, padding: "3px 10px", fontSize: font.sm, display: "flex", alignItems: "center", gap: 6 }}>
                  {c}
                  <button onClick={() => setForm((f) => ({ ...f, contraindications: (f.contraindications ?? []).filter((x) => x !== c) }))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", lineHeight: 1, padding: 0, fontSize: 14 }}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Side Effects</label>
            <textarea style={textareaStyle} placeholder="Hypersensitivity reactions, GI disturbances…" value={form.side_effects}
              onChange={(e) => s("side_effects")(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Drug Interactions</label>
            <textarea style={textareaStyle} placeholder="e.g. Probenecid, oral contraceptives, anticoagulants…" value={form.drug_interactions}
              onChange={(e) => s("drug_interactions")(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Precautions</label>
            <textarea style={textareaStyle} placeholder="Cross-allergy risk, renal impairment…" value={form.precautions}
              onChange={(e) => s("precautions")(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Pregnancy &amp; Lactation</label>
            <textarea style={textareaStyle} placeholder="e.g. Safe in pregnancy; excreted in breast milk" value={form.pregnancy_notes}
              onChange={(e) => s("pregnancy_notes")(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Mode of Action / Pharmacology</label>
          <textarea style={textareaStyle} placeholder="Mechanism of action, pharmacokinetics…" value={form.mode_of_action}
            onChange={(e) => s("mode_of_action")(e.target.value)} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Storage</label>
          <input style={inputStyle} placeholder="e.g. Store in a cool and dry place, protect from light" value={form.storage}
            onChange={(e) => s("storage")(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}>Cancel</button>
          <button
            onClick={() => {
              setError("");
              if (!form.generic_name.trim()) return setError("Generic name is required");
              if (!form.drug_class.trim()) return setError("Drug class is required");
              mutation.mutate(form);
            }}
            disabled={mutation.isPending}
            style={{ padding: "8px 22px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600, opacity: mutation.isPending ? 0.7 : 1 }}>
            {mutation.isPending ? "Saving…" : generic ? "Save Changes" : "Add Generic"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Brand medicine modal ──────────────────────────────────────────────────────

function BrandModal({
  brand,
  generics,
  manufacturers,
  onClose,
  onSaved,
}: {
  brand?: BrandMedicine;
  generics: GenericMedicine[];
  manufacturers: Manufacturer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateBrandPayload>({
    generic_id:   brand?.generic_id   ?? "",
    brand_name:   brand?.brand_name   ?? "",
    manufacturer: brand?.manufacturer ?? "",
    strength:     brand?.strength     ?? "",
    form:         brand?.form         ?? "tablet",
    mrp:          brand?.mrp          ?? null,
    product_code: brand?.product_code ?? "",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data: CreateBrandPayload | UpdateBrandPayload) =>
      brand
        ? medicinesApi.updateBrand(brand.id, data)
        : medicinesApi.createBrand(data as CreateBrandPayload),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to save"),
  });

  const handleSubmit = () => {
    setError("");
    if (!form.generic_id) return setError("Select a generic medicine");
    if (!form.brand_name.trim()) return setError("Brand name is required");
    if (!form.manufacturer) return setError("Select a manufacturer");
    if (!form.strength.trim()) return setError("Strength is required");
    mutation.mutate(form);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, padding: 32, width: "min(540px, 96vw)", maxHeight: "92vh", overflowY: "auto", boxShadow: shadow.lg }}>
        <h3 style={{ margin: "0 0 20px", fontSize: font.lg, fontWeight: 700, color: colors.text }}>
          {brand ? "Edit Brand Medicine" : "Add Brand Medicine"}
        </h3>

        {error && <ErrBanner msg={error} />}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Generic Medicine *</label>
          <select style={{ ...inputStyle, background: colors.white }} value={form.generic_id}
            onChange={(e) => setForm((f) => ({ ...f, generic_id: e.target.value }))} disabled={!!brand}>
            <option value="">— Select generic —</option>
            {generics.map((g) => (
              <option key={g.id} value={g.id}>{g.generic_name} ({g.drug_class})</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Brand Name *</label>
          <input style={inputStyle} placeholder="e.g. Napa" value={form.brand_name}
            onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Manufacturer *</label>
          <select style={{ ...inputStyle, background: colors.white }} value={form.manufacturer}
            onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}>
            <option value="">— Select manufacturer —</option>
            {manufacturers.map((m) => (
              <option key={m.id} value={m.name}>{m.name}{m.country ? ` (${m.country})` : ""}</option>
            ))}
          </select>
          {manufacturers.length === 0 && (
            <div style={{ fontSize: font.sm, color: colors.textMuted, marginTop: 4 }}>
              No manufacturers yet — add one in the Manufacturers tab first.
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Strength *</label>
            <input style={inputStyle} placeholder="e.g. 250 mg/5 ml" value={form.strength}
              onChange={(e) => setForm((f) => ({ ...f, strength: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Form *</label>
            <select style={{ ...inputStyle, background: colors.white }} value={form.form}
              onChange={(e) => setForm((f) => ({ ...f, form: e.target.value }))}>
              {MEDICINE_FORMS.map((f) => (
                <option key={f} value={f}>{MEDICINE_FORM_LABELS[f] ?? f}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
          <div>
            <label style={labelStyle}>MRP (৳)</label>
            <input type="number" min="0" step="0.01" placeholder="e.g. 84.43"
              style={inputStyle} value={form.mrp ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value ? parseFloat(e.target.value) : null }))} />
          </div>
          <div>
            <label style={labelStyle}>Product Code</label>
            <input style={inputStyle} placeholder="e.g. 13394" value={form.product_code ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, product_code: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}>Cancel</button>
          <button onClick={handleSubmit} disabled={mutation.isPending}
            style={{ padding: "8px 22px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600, opacity: mutation.isPending ? 0.7 : 1 }}>
            {mutation.isPending ? "Saving…" : brand ? "Save Changes" : "Add Brand"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Manufacturers tab ─────────────────────────────────────────────────────────

function ManufacturersTab({ canWrite, canDelete }: { canWrite: boolean; canDelete: boolean }) {
  const qc = useQueryClient();
  const { toast, show: showToast, dismiss } = useToast();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; manufacturer?: Manufacturer }>({ open: false });

  const { data, isLoading } = useQuery({
    queryKey: ["manufacturers", search, showInactive],
    queryFn: () => medicinesApi.listManufacturers({ search, active_only: !showInactive, limit: 200 }),
    staleTime: 30_000,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => medicinesApi.deactivateManufacturer(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["manufacturers"] }); showToast("Manufacturer deactivated", "info"); },
    onError: () => showToast("Failed to deactivate", "error"),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => medicinesApi.updateManufacturer(id, { is_active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["manufacturers"] }); showToast("Manufacturer reactivated", "success"); },
    onError: () => showToast("Failed to reactivate", "error"),
  });

  const manufacturers = data?.results ?? [];

  return (
    <>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inputStyle, maxWidth: 300 }} placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: font.base, color: colors.textMuted, flexShrink: 0 }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
        <span style={{ color: colors.textMuted, fontSize: font.sm }}>{data?.count ?? 0} result{data?.count !== 1 ? "s" : ""}</span>
        {canWrite && (
          <button onClick={() => setModal({ open: true })}
            style={{ marginLeft: "auto", padding: "8px 18px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600 }}>
            + Add Manufacturer
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>Loading…</div>
      ) : manufacturers.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>No manufacturers found.</div>
      ) : (
        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: colors.bg }}>
                <th style={thStyle}>Company Name</th>
                <th style={thStyle}>Country</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
                {canWrite && <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {manufacturers.map((m) => (
                <tr key={m.id} style={{ opacity: m.is_active ? 1 : 0.55 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{m.name}</td>
                  <td style={{ ...tdStyle, color: colors.textMuted, fontSize: font.sm }}>{m.country || "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: font.sm, fontWeight: 600, background: m.is_active ? "#f0fdf4" : "#fef2f2", color: m.is_active ? "#166534" : "#991b1b" }}>
                      {m.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {canWrite && (
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <EditBtn onClick={() => setModal({ open: true, manufacturer: m })} />
                        {canDelete && (
                          m.is_active ? (
                            <button onClick={() => { if (confirm(`Deactivate "${m.name}"?`)) deactivateMutation.mutate(m.id); }}
                              style={{ padding: "4px 12px", background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}>
                              Deactivate
                            </button>
                          ) : (
                            <button onClick={() => reactivateMutation.mutate(m.id)}
                              style={{ padding: "4px 12px", background: "#f0fdf4", color: colors.success, border: "1px solid #bbf7d0", borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}>
                              Reactivate
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <ManufacturerModal manufacturer={modal.manufacturer}
          onClose={() => setModal({ open: false })}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["manufacturers"] }); showToast(modal.manufacturer ? "Manufacturer updated" : "Manufacturer added", "success"); }} />
      )}
    </>
  );
}

// ── Generics tab ──────────────────────────────────────────────────────────────

function GenericsTab({ canWrite, canDelete }: { canWrite: boolean; canDelete: boolean }) {
  const qc = useQueryClient();
  const { toast, show: showToast, dismiss } = useToast();
  const [search, setSearch] = useState("");
  const [drugClass, setDrugClass] = useState("");
  const [modal, setModal] = useState<{ open: boolean; generic?: GenericMedicine }>({ open: false });

  const { data, isLoading } = useQuery({
    queryKey: ["generics", search, drugClass],
    queryFn: () => medicinesApi.listGenerics({ search, drug_class: drugClass, limit: 100 }),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => medicinesApi.deleteGeneric(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["generics"] }); showToast("Generic medicine deleted", "info"); },
    onError: (e: any) => showToast(e?.response?.data?.error ?? "Cannot delete", "error"),
  });

  const generics = data?.results ?? [];

  return (
    <>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inputStyle, maxWidth: 280 }} placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input style={{ ...inputStyle, maxWidth: 220 }} placeholder="Filter by drug class…" value={drugClass} onChange={(e) => setDrugClass(e.target.value)} />
        <span style={{ color: colors.textMuted, fontSize: font.sm }}>{data?.count ?? 0} result{data?.count !== 1 ? "s" : ""}</span>
        {canWrite && (
          <button onClick={() => setModal({ open: true })}
            style={{ marginLeft: "auto", padding: "8px 18px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600 }}>
            + Add Generic
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>Loading…</div>
      ) : generics.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>No generic medicines found.</div>
      ) : (
        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: colors.bg }}>
                <th style={thStyle}>Generic Name</th>
                <th style={thStyle}>Drug Class</th>
                <th style={thStyle}>Therapeutic Class</th>
                <th style={thStyle}>Contraindications</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Brands</th>
                {canWrite && <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {generics.map((g) => (
                <tr key={g.id}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 180 }}>{g.generic_name}</td>
                  <td style={tdStyle}>
                    <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "2px 10px", fontSize: font.sm, fontWeight: 500 }}>{g.drug_class}</span>
                  </td>
                  <td style={{ ...tdStyle, color: colors.textMuted, fontSize: font.sm }}>
                    {g.therapeutic_class || <span style={{ color: colors.border }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    {g.contraindications.length === 0 ? <span style={{ color: colors.textMuted, fontSize: font.sm }}>—</span> : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {g.contraindications.slice(0, 2).map((c) => (
                          <span key={c} style={{ background: "#fef9c3", color: "#92400e", borderRadius: 999, padding: "2px 8px", fontSize: "12px" }}>{c}</span>
                        ))}
                        {g.contraindications.length > 2 && <span style={{ color: colors.textMuted, fontSize: "12px" }}>+{g.contraindications.length - 2} more</span>}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={{ fontWeight: 600, color: g.brand_count > 0 ? colors.primary : colors.textMuted }}>{g.brand_count}</span>
                  </td>
                  {canWrite && (
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <EditBtn onClick={() => setModal({ open: true, generic: g })} />
                        {canDelete && (
                          <button
                            onClick={() => {
                              if (g.brand_count > 0) { showToast(`Cannot delete: ${g.brand_count} brand(s) linked`, "error"); return; }
                              if (confirm(`Delete "${g.generic_name}"? This cannot be undone.`)) deleteMutation.mutate(g.id);
                            }}
                            style={{ padding: "4px 12px", background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <GenericModal generic={modal.generic} onClose={() => setModal({ open: false })}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["generics"] }); showToast(modal.generic ? "Generic updated" : "Generic added", "success"); }} />
      )}
    </>
  );
}

// ── Brands tab ────────────────────────────────────────────────────────────────

function BrandsTab({ canWrite, canDelete }: { canWrite: boolean; canDelete: boolean }) {
  const qc = useQueryClient();
  const { toast, show: showToast, dismiss } = useToast();
  const [search, setSearch] = useState("");
  const [formFilter, setFormFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; brand?: BrandMedicine }>({ open: false });

  const { data, isLoading } = useQuery({
    queryKey: ["brands", search, formFilter, showInactive],
    queryFn: () => medicinesApi.listBrands({ search, form: formFilter, active_only: !showInactive, limit: 100 }),
    staleTime: 30_000,
  });

  const { data: genericsData } = useQuery({
    queryKey: ["generics-all"],
    queryFn: () => medicinesApi.listGenerics({ limit: 500 }),
    staleTime: 60_000,
  });

  const { data: manufacturersData } = useQuery({
    queryKey: ["manufacturers-all"],
    queryFn: () => medicinesApi.listManufacturers({ active_only: true, limit: 500 }),
    staleTime: 60_000,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => medicinesApi.deactivateBrand(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["brands"] }); showToast("Brand deactivated", "info"); },
    onError: () => showToast("Failed to deactivate", "error"),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => medicinesApi.updateBrand(id, { is_active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["brands"] }); showToast("Brand reactivated", "success"); },
    onError: () => showToast("Failed to reactivate", "error"),
  });

  const brands = data?.results ?? [];
  const generics = genericsData?.results ?? [];
  const manufacturers = manufacturersData?.results ?? [];
  const genericMap = Object.fromEntries(generics.map((g) => [g.id, g.generic_name]));

  return (
    <>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inputStyle, maxWidth: 280 }} placeholder="Search brand or generic…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={{ ...inputStyle, maxWidth: 200, background: colors.white }} value={formFilter} onChange={(e) => setFormFilter(e.target.value)}>
          <option value="">All forms</option>
          {MEDICINE_FORMS.map((f) => <option key={f} value={f}>{MEDICINE_FORM_LABELS[f] ?? f}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: font.base, color: colors.textMuted, flexShrink: 0 }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
        <span style={{ color: colors.textMuted, fontSize: font.sm }}>{data?.count ?? 0} result{data?.count !== 1 ? "s" : ""}</span>
        {canWrite && (
          <button onClick={() => setModal({ open: true })}
            style={{ marginLeft: "auto", padding: "8px 18px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600 }}>
            + Add Brand
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>Loading…</div>
      ) : brands.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>No brand medicines found.</div>
      ) : (
        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: colors.bg }}>
                <th style={thStyle}>Brand Name</th>
                <th style={thStyle}>Generic</th>
                <th style={thStyle}>Manufacturer</th>
                <th style={thStyle}>Strength</th>
                <th style={thStyle}>Form</th>
                <th style={{ ...thStyle, textAlign: "right" }}>MRP (৳)</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
                {canWrite && <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id} style={{ opacity: b.is_active ? 1 : 0.55 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{b.brand_name}</td>
                  <td style={{ ...tdStyle, color: colors.textMuted, fontSize: font.sm }}>{genericMap[b.generic_id] ?? "—"}</td>
                  <td style={{ ...tdStyle, color: colors.textMuted, fontSize: font.sm }}>{b.manufacturer}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: font.sm }}>{b.strength}</td>
                  <td style={tdStyle}><FormPill form={b.form} /></td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: b.mrp != null ? colors.text : colors.textMuted }}>
                    {b.mrp != null ? `৳${b.mrp.toFixed(2)}` : "—"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: font.sm, fontWeight: 600, background: b.is_active ? "#f0fdf4" : "#fef2f2", color: b.is_active ? "#166534" : "#991b1b" }}>
                      {b.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {canWrite && (
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <EditBtn onClick={() => setModal({ open: true, brand: b })} />
                        {canDelete && (
                          b.is_active ? (
                            <button onClick={() => { if (confirm(`Deactivate "${b.brand_name}"?`)) deactivateMutation.mutate(b.id); }}
                              style={{ padding: "4px 12px", background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}>
                              Deactivate
                            </button>
                          ) : (
                            <button onClick={() => reactivateMutation.mutate(b.id)}
                              style={{ padding: "4px 12px", background: "#f0fdf4", color: colors.success, border: "1px solid #bbf7d0", borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}>
                              Reactivate
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <BrandModal
          brand={modal.brand}
          generics={generics}
          manufacturers={manufacturers}
          onClose={() => setModal({ open: false })}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["brands"] }); showToast(modal.brand ? "Brand updated" : "Brand added", "success"); }}
        />
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "manufacturers" | "generics" | "brands";

export default function MedicinesPage() {
  const [tab, setTab] = useState<Tab>("generics");
  const { user } = useAuthStore();

  const role = user?.role ?? "";
  const canWrite = ["doctor", "admin", "super_admin"].includes(role);
  const canDelete = ["admin", "super_admin"].includes(role);

  const TABS: { id: Tab; label: string }[] = [
    { id: "generics",      label: "Generic Medicines" },
    { id: "brands",        label: "Brand Medicines" },
    { id: "manufacturers", label: "Manufacturers" },
  ];

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: "10px 24px",
    background: active ? colors.white : "transparent",
    border: active ? `1px solid ${colors.border}` : "1px solid transparent",
    borderBottom: active ? `1px solid ${colors.white}` : `1px solid ${colors.border}`,
    borderRadius: `${radius.md} ${radius.md} 0 0`,
    cursor: "pointer",
    fontSize: font.base,
    fontWeight: active ? 600 : 400,
    color: active ? colors.primary : colors.textMuted,
    marginBottom: -1,
    position: "relative" as const,
    zIndex: active ? 1 : 0,
  });

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>Medicines</h1>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
            Manage manufacturers, generic medicines, and brand catalogue
          </p>
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${colors.border}`, marginBottom: 24 }}>
          {TABS.map((t) => (
            <button key={t.id} style={TAB_STYLE(tab === t.id)} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "generics"      && <GenericsTab      canWrite={canWrite} canDelete={canDelete} />}
        {tab === "brands"        && <BrandsTab        canWrite={canWrite} canDelete={canDelete} />}
        {tab === "manufacturers" && <ManufacturersTab canWrite={canWrite} canDelete={canDelete} />}
      </div>
    </AppShell>
  );
}
