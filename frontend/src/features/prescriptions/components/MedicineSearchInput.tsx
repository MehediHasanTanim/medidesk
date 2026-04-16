import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { medicinesApi, type MedicineSearchResult } from "@/features/medicines/api/medicinesApi";

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

export default function MedicineSearchInput({
  onSelect,
}: {
  onSelect: (m: MedicineSearchResult) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: results = [] } = useQuery({
    queryKey: ["medicine-search", q],
    queryFn: () => medicinesApi.search(q),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={labelStyle}>Search Medicine</label>
      <input
        type="text"
        placeholder="Type brand name or generic (min 2 chars)…"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={inputStyle}
        autoComplete="off"
      />
      {open && q.length >= 2 && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: colors.white, border: `1px solid ${colors.border}`,
          borderRadius: radius.md, boxShadow: shadow.md, maxHeight: 200, overflowY: "auto",
          marginTop: 2,
        }}>
          {results.map((m) => (
            <div
              key={m.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(m);
                setQ("");
                setOpen(false);
              }}
              style={{
                padding: "9px 14px", cursor: "pointer",
                borderBottom: `1px solid ${colors.borderLight}`, fontSize: font.base,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = colors.white)}
            >
              <span style={{ fontWeight: 600, color: colors.text }}>{m.brand_name}</span>
              <span style={{ color: colors.textMuted, fontSize: font.sm }}>
                {" "}{m.strength} · {m.form} · {m.manufacturer}
              </span>
            </div>
          ))}
        </div>
      )}
      {open && q.length >= 2 && results.length === 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: colors.white, border: `1px solid ${colors.border}`,
          borderRadius: radius.md, padding: "10px 14px", fontSize: font.sm,
          color: colors.textMuted, marginTop: 2,
        }}>
          No medicines found
        </div>
      )}
    </div>
  );
}
