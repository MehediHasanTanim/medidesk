import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/shared/lib/apiClient";
import AppShell from "@/shared/components/AppShell";
import { colors, font, radius, shadow } from "@/shared/styles/theme";

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["patients", debouncedSearch],
    queryFn: () =>
      apiClient.get("/patients/search/", { params: { q: debouncedSearch } }).then((r) => r.data),
    enabled: true,
  });

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any)._searchTimer);
    (window as any)._searchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>Patients</h1>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>Search and manage patient records</p>
        </div>

        <input
          placeholder="Search by name, phone, or patient ID…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: radius.md, border: `1px solid ${colors.border}`, marginBottom: 20, boxSizing: "border-box", fontSize: font.base, color: colors.text, background: colors.white }}
        />

        {isLoading && <p style={{ color: colors.textMuted }}>Searching…</p>}

        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: colors.bg }}>
                {["Patient ID", "Name", "Phone", "Age", "Gender"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: font.sm, fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.results?.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                  <td style={{ padding: "12px 16px", color: colors.primary, fontWeight: 500, fontSize: font.base }}>{p.patient_id}</td>
                  <td style={{ padding: "12px 16px", color: colors.text, fontSize: font.base }}>{p.full_name}</td>
                  <td style={{ padding: "12px 16px", color: colors.textMuted, fontSize: font.base }}>{p.phone}</td>
                  <td style={{ padding: "12px 16px", color: colors.textMuted, fontSize: font.base }}>{p.age ?? "—"}</td>
                  <td style={{ padding: "12px 16px", color: colors.textMuted, fontSize: font.base }}>{p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : "Other"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.results?.length === 0 && <p style={{ padding: "20px 16px", color: colors.textMuted }}>No patients found.</p>}
        </div>
      </div>
    </AppShell>
  );
}
