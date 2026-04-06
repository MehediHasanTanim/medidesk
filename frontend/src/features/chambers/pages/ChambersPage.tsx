import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import MapPicker from "@/shared/components/MapPicker";
import { chambersApi, type ChamberPayload } from "@/features/chambers/api/chambersApi";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import type { Chamber } from "@/shared/types/auth";
import { useAuthStore } from "@/features/auth/store/authStore";

const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: `1px solid ${colors.border}`, borderRadius: radius.md,
  fontSize: font.base, boxSizing: "border-box" as const,
  color: colors.text, background: colors.bg,
};

function ChamberModal({
  chamber,
  onClose,
  onSaved,
}: {
  chamber?: Chamber;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ChamberPayload>({
    name: chamber?.name ?? "",
    address: chamber?.address ?? "",
    phone: chamber?.phone ?? "",
    latitude: chamber?.latitude ?? null,
    longitude: chamber?.longitude ?? null,
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data: ChamberPayload) =>
      chamber ? chambersApi.update(chamber.id, data) : chambersApi.create(data),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Failed to save chamber.");
    },
  });

  const set = (key: keyof ChamberPayload, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setCoords = (lat: number, lng: number, address?: string) =>
    setForm((f) => ({
      ...f,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      ...(address ? { address } : {}),
    }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: colors.white, borderRadius: radius.lg,
        padding: 32, width: 580, maxHeight: "90vh",
        overflowY: "auto", boxShadow: shadow.lg,
      }}>
        <h3 style={{ margin: "0 0 20px", fontSize: font.lg, fontWeight: 600 }}>
          {chamber ? "Edit Chamber" : "Add Chamber"}
        </h3>

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 14px", borderRadius: radius.md, marginBottom: 16 }}>{error}</div>}

        {(["name", "address", "phone"] as const).map((field) => (
          <div key={field} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base, textTransform: "capitalize" }}>{field}</label>
            <input
              value={form[field]}
              onChange={(e) => set(field, e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: font.base }}>
            GPS Location <span style={{ color: colors.textMuted, fontWeight: 400 }}>(optional)</span>
          </label>
          <MapPicker
            lat={form.latitude ?? null}
            lng={form.longitude ?? null}
            onChange={setCoords}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", background: colors.borderLight, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}>Cancel</button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
            style={{ padding: "8px 18px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChambersPage() {
  const [modal, setModal] = useState<{ open: boolean; chamber?: Chamber }>({ open: false });
  const [showInactive, setShowInactive] = useState(false);
  const qc = useQueryClient();
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const { data: chambers = [], isLoading } = useQuery({
    queryKey: ["chambers", showInactive],
    queryFn: () => chambersApi.list(!showInactive),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => chambersApi.update(id, { is_active: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chambers"] }),
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => chambersApi.update(id, { is_active: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chambers"] }),
  });

  const deleteChamber = useMutation({
    mutationFn: (id: string) => chambersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chambers"] }),
  });

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>Chambers</h1>
            <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
              Clinic branches and consultation rooms
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: font.base, color: colors.textMuted }}>
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Show inactive
            </label>
            {isAdmin() && (
              <button
                onClick={() => setModal({ open: true })}
                style={{ padding: "9px 20px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}
              >
                + Add Chamber
              </button>
            )}
          </div>
        </div>

        {/* Cards grid */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: colors.textMuted }}>Loading…</div>
        ) : chambers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: colors.textMuted }}>No chambers found.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {chambers.map((c: Chamber) => (
              <div key={c.id} style={{
                background: colors.white, borderRadius: radius.lg,
                boxShadow: shadow.sm, padding: 20,
                border: c.is_active ? `1px solid ${colors.border}` : `1px dashed ${colors.border}`,
                opacity: c.is_active ? 1 : 0.65,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ fontSize: font.lg, fontWeight: 600, color: colors.text }}>
                    🏥 {c.name}
                  </div>
                  <span style={{
                    padding: "2px 9px", borderRadius: 999, fontSize: "12px", fontWeight: 600,
                    background: c.is_active ? "#dcfce7" : "#fee2e2",
                    color: c.is_active ? "#166534" : "#991b1b",
                  }}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div style={{ color: colors.textMuted, fontSize: font.base, marginBottom: 6 }}>📍 {c.address}</div>
                {c.latitude != null && c.longitude != null && (
                  <div style={{ color: colors.textMuted, fontSize: "12px", marginBottom: 6, fontFamily: "monospace" }}>
                    🌐 {c.latitude.toFixed(6)}, {c.longitude.toFixed(6)}
                  </div>
                )}
                <div style={{ color: colors.textMuted, fontSize: font.base, marginBottom: 16 }}>📞 {c.phone}</div>
                {isAdmin() && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setModal({ open: true, chamber: c })}
                      style={{ padding: "5px 14px", background: colors.primaryLight, color: colors.primary, border: `1px solid #bfdbfe`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                    >
                      Edit
                    </button>
                    {c.is_active ? (
                      <button
                        onClick={() => { if (confirm(`Deactivate "${c.name}"?`)) deactivate.mutate(c.id); }}
                        style={{ padding: "5px 14px", background: "#fef2f2", color: colors.danger, border: `1px solid #fecaca`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivate.mutate(c.id)}
                        style={{ padding: "5px 14px", background: "#f0fdf4", color: colors.success, border: `1px solid #bbf7d0`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                      >
                        Reactivate
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Permanently delete "${c.name}"? This cannot be undone.`))
                          deleteChamber.mutate(c.id);
                      }}
                      style={{ padding: "5px 14px", background: colors.danger, color: colors.white, border: "none", borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal.open && (
        <ChamberModal
          chamber={modal.chamber}
          onClose={() => setModal({ open: false })}
          onSaved={() => qc.invalidateQueries({ queryKey: ["chambers"] })}
        />
      )}
    </AppShell>
  );
}
