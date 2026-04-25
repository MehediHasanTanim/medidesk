import React, { useState, useEffect, useRef, Fragment } from "react";
import AppShell from "@/shared/components/AppShell";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import apiClient from "@/shared/lib/apiClient";
import { useAuditLogs } from "../api/auditLogsApi";
import type { AuditLog, AuditLogFilters } from "../types";

const PAGE_SIZE = 20;

const RESOURCE_TYPES = [
  "patient", "appointment", "consultation", "prescription",
  "billing", "test_order", "user", "medicine",
];

const ACTION_STYLES: Record<string, { bg: string; color: string }> = {
  CREATE: { bg: "#d1fae5", color: "#065f46" },
  UPDATE: { bg: "#dbeafe", color: "#1e40af" },
  DELETE: { bg: "#fee2e2", color: "#991b1b" },
  VIEW:   { bg: "#f3f4f6", color: "#374151" },
  LOGIN:  { bg: "#ccfbf1", color: "#0f766e" },
  LOGOUT: { bg: "#ccfbf1", color: "#0f766e" },
};

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function ActionPill({ action }: { action: AuditLog["action"] }) {
  const style = ACTION_STYLES[action] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 999,
      fontSize: font.sm,
      fontWeight: 600,
      background: style.bg,
      color: style.color,
    }}>
      {action}
    </span>
  );
}

// ── Payload detail panel ─────────────────────────────────────────────────────

/** "user_id" → "User ID", "resource_type" → "Resource Type" */
function formatKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(v: unknown, depth = 0): React.ReactNode {
  if (v === null || v === undefined) {
    return <span style={{ color: colors.textMuted, fontStyle: "italic" }}>—</span>;
  }
  if (typeof v === "boolean") {
    return (
      <span style={{
        display: "inline-block", padding: "1px 8px", borderRadius: 999,
        fontSize: font.sm, fontWeight: 600,
        background: v ? "#d1fae5" : "#fee2e2",
        color: v ? "#065f46" : "#991b1b",
      }}>
        {v ? "Yes" : "No"}
      </span>
    );
  }
  if (Array.isArray(v)) {
    if (v.length === 0) {
      return <span style={{ color: colors.textMuted, fontStyle: "italic" }}>Empty list</span>;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {v.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: colors.textMuted, fontFamily: "monospace", minWidth: 20 }}>{i + 1}.</span>
            <span>{renderValue(item, depth + 1)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length === 0) {
      return <span style={{ color: colors.textMuted, fontStyle: "italic" }}>—</span>;
    }
    if (depth >= 2) {
      // Avoid infinite nesting — fall back to compact JSON
      return (
        <span style={{ fontFamily: "monospace", wordBreak: "break-all", fontSize: font.sm, color: colors.textMuted }}>
          {JSON.stringify(v)}
        </span>
      );
    }
    return (
      <div style={{
        display: "grid", gridTemplateColumns: "max-content 1fr", gap: "3px 12px",
        paddingLeft: 8, borderLeft: `2px solid ${colors.borderLight}`, marginTop: 2,
      }}>
        {entries.map(([k, val]) => (
          <Fragment key={k}>
            <span style={{ color: colors.textMuted, fontWeight: 500, fontSize: font.sm, whiteSpace: "nowrap" }}>
              {formatKey(k)}
            </span>
            <span style={{ fontSize: font.sm, color: colors.text }}>
              {renderValue(val, depth + 1)}
            </span>
          </Fragment>
        ))}
      </div>
    );
  }
  return <span style={{ wordBreak: "break-all" }}>{String(v)}</span>;
}

/** 3-column diff table for payloads that carry { old: {...}, new: {...} } */
function DiffView({ old_, new_ }: { old_: Record<string, unknown>; new_: Record<string, unknown> }) {
  const allKeys = Array.from(new Set([...Object.keys(old_), ...Object.keys(new_)]));
  const changed = allKeys.filter((k) => JSON.stringify(old_[k]) !== JSON.stringify(new_[k]));

  if (changed.length === 0) {
    return <p style={{ margin: 0, fontSize: font.sm, color: colors.textMuted, fontStyle: "italic" }}>No field changes detected.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: font.sm }}>
        <thead>
          <tr>
            {["Field", "Before", "After"].map((h) => (
              <th key={h} style={{
                padding: "4px 12px 6px", textAlign: "left",
                fontWeight: 600, color: colors.textMuted,
                borderBottom: `1px solid ${colors.border}`,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {changed.map((k) => (
            <tr key={k}>
              <td style={{ padding: "4px 12px", fontWeight: 500, color: colors.textMuted, whiteSpace: "nowrap", verticalAlign: "top" }}>
                {formatKey(k)}
              </td>
              <td style={{ padding: "4px 12px", verticalAlign: "top" }}>
                <span style={{
                  display: "inline-block", background: "#fee2e2", color: "#991b1b",
                  padding: "1px 6px", borderRadius: 4, fontFamily: "monospace", wordBreak: "break-all",
                }}>
                  {old_[k] === undefined ? "—" : old_[k] === null ? "null" : String(old_[k])}
                </span>
              </td>
              <td style={{ padding: "4px 12px", verticalAlign: "top" }}>
                <span style={{
                  display: "inline-block", background: "#d1fae5", color: "#065f46",
                  padding: "1px 6px", borderRadius: 4, fontFamily: "monospace", wordBreak: "break-all",
                }}>
                  {new_[k] === undefined ? "—" : new_[k] === null ? "null" : String(new_[k])}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayloadDetail({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload);
  if (entries.length === 0) {
    return <p style={{ margin: 0, fontSize: font.sm, color: colors.textMuted, fontStyle: "italic" }}>No payload data.</p>;
  }

  // Detect diff pattern: payload has "old" and "new" keys that are plain objects
  const old_ = payload.old;
  const new_ = payload.new;
  const isDiff =
    old_ !== null && old_ !== undefined &&
    new_ !== null && new_ !== undefined &&
    typeof old_ === "object" && !Array.isArray(old_) &&
    typeof new_ === "object" && !Array.isArray(new_);

  if (isDiff) {
    const otherEntries = entries.filter(([k]) => k !== "old" && k !== "new");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {otherEntries.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 16px", fontSize: font.sm }}>
            {otherEntries.map(([k, v]) => (
              <Fragment key={k}>
                <span style={{ color: colors.textMuted, fontWeight: 500, whiteSpace: "nowrap" }}>{formatKey(k)}</span>
                <span style={{ color: colors.text }}>{renderValue(v)}</span>
              </Fragment>
            ))}
          </div>
        )}
        <DiffView
          old_={old_ as Record<string, unknown>}
          new_={new_ as Record<string, unknown>}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 16px", fontSize: font.sm }}>
      {entries.map(([k, v]) => (
        <Fragment key={k}>
          <span style={{ color: colors.textMuted, fontWeight: 500, whiteSpace: "nowrap" }}>{formatKey(k)}</span>
          <span style={{ color: colors.text }}>{renderValue(v)}</span>
        </Fragment>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function AuditLogsPage() {
  const [userSearch, setUserSearch] = useState("");
  const [debouncedUser, setDebouncedUser] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedUser(userSearch.trim());
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [userSearch]);

  useEffect(() => { setPage(1); }, [action, resourceType, dateFrom, dateTo]);

  const filters: AuditLogFilters = {
    ...(debouncedUser ? { user_id: debouncedUser } : {}),
    ...(action ? { action } : {}),
    ...(resourceType ? { resource_type: resourceType } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
    page,
    page_size: PAGE_SIZE,
  };

  const { data, isLoading } = useAuditLogs(filters);

  const logs = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const resetFilters = () => {
    setUserSearch("");
    setDebouncedUser("");
    setAction("");
    setResourceType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      // Build params from current active filters — no page/page_size, backend uses its own CSV cap
      const params: Record<string, string> = { format: "csv" };
      if (debouncedUser) params.user_id = debouncedUser;
      if (action) params.action = action;
      if (resourceType) params.resource_type = resourceType;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      // Use apiClient so the JWT Authorization header is included automatically
      const response = await apiClient.get("/api/v1/audit-logs/", {
        params,
        responseType: "blob",
      });

      // Build a timestamped filename
      const date = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const filename = `audit-logs-${date}.csv`;

      // Programmatic download via a temporary anchor
      const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      // If the download fails, fail silently — the button simply re-enables
    } finally {
      setIsExporting(false);
    }
  };

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const inputStyle = {
    padding: "8px 12px",
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    fontSize: font.sm,
    color: colors.text,
    background: colors.white,
    boxSizing: "border-box" as const,
  };

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>Audit Logs</h1>
            <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
              Track all user activity across MediDesk
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            style={{
              padding: "9px 18px",
              background: colors.white,
              color: isExporting ? colors.textMuted : colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              cursor: isExporting ? "not-allowed" : "pointer",
              fontSize: font.sm,
              fontWeight: 500,
              opacity: isExporting ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {isExporting ? "Exporting…" : "⬇ Export CSV"}
          </button>
        </div>

        {/* Filter bar */}
        <div style={{
          background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm,
          padding: "16px 20px", marginBottom: 20,
          display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px" }}>
            <label style={{ fontSize: font.sm, fontWeight: 500, color: colors.textMuted }}>User ID</label>
            <input
              placeholder="Filter by user ID…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ ...inputStyle, minWidth: 0 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: font.sm, fontWeight: 500, color: colors.textMuted }}>Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">All</option>
              {(["CREATE", "UPDATE", "DELETE", "VIEW", "LOGIN", "LOGOUT"] as const).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: font.sm, fontWeight: 500, color: colors.textMuted }}>Resource</label>
            <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">All</option>
              {RESOURCE_TYPES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: font.sm, fontWeight: 500, color: colors.textMuted }}>From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: font.sm, fontWeight: 500, color: colors.textMuted }}>To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
          </div>

          <button
            onClick={resetFilters}
            style={{
              padding: "8px 16px", background: colors.borderLight, color: colors.textMuted,
              border: `1px solid ${colors.border}`, borderRadius: radius.md,
              cursor: "pointer", fontSize: font.sm, alignSelf: "flex-end",
            }}
          >
            Reset
          </button>
        </div>

        {/* Table */}
        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>Loading…</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>No audit logs found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: colors.bg }}>
                  {["Timestamp", "User", "Action", "Resource", "IP Address", ""].map((h, i) => (
                    <th key={i} style={{
                      padding: "12px 16px", textAlign: "left",
                      fontSize: font.sm, fontWeight: 600, color: colors.textMuted,
                      borderBottom: `1px solid ${colors.border}`, whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => toggleExpand(log.id)}
                      style={{
                        borderBottom: expandedId === log.id ? "none" : `1px solid ${colors.borderLight}`,
                        cursor: "pointer",
                        background: expandedId === log.id ? colors.bg : undefined,
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: font.sm, color: colors.textMuted, whiteSpace: "nowrap" }}>
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: font.base, color: colors.text, fontWeight: 500 }}>
                        {log.user_name ?? (
                          <span style={{ color: colors.textMuted, fontStyle: "italic", fontWeight: 400 }}>System</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <ActionPill action={log.action} />
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: font.sm, color: colors.text }}>
                        <span style={{ fontWeight: 500 }}>{log.resource_type}</span>
                        {log.resource_id && (
                          <span style={{ color: colors.textMuted }}> #{log.resource_id.slice(0, 8)}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: font.sm, color: colors.textMuted, fontFamily: "monospace" }}>
                        {log.ip_address ?? "—"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(log.id); }}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: colors.primary, fontSize: font.sm, fontWeight: 500, padding: "2px 8px",
                          }}
                        >
                          {expandedId === log.id ? "▲ Hide" : "▼ Details"}
                        </button>
                      </td>
                    </tr>

                    {expandedId === log.id && (
                      <tr style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                        <td colSpan={6} style={{ padding: "12px 20px 16px 20px", background: colors.bg }}>
                          <p style={{ margin: "0 0 8px", fontSize: font.sm, fontWeight: 600, color: colors.textMuted }}>
                            Payload
                          </p>
                          <PayloadDetail payload={log.payload} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <span style={{ color: colors.textMuted, fontSize: font.sm }}>
              Page {page} of {totalPages} · {total} total
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(1)} disabled={page === 1}
                style={{ padding: "6px 12px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: page === 1 ? "not-allowed" : "pointer", fontSize: font.sm, opacity: page === 1 ? 0.5 : 1 }}>
                «
              </button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "6px 14px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: page === 1 ? "not-allowed" : "pointer", fontSize: font.sm, opacity: page === 1 ? 0.5 : 1 }}>
                ‹ Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 2)
                .map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    style={{
                      padding: "6px 12px",
                      border: `1px solid ${p === page ? colors.primary : colors.border}`,
                      borderRadius: radius.md,
                      background: p === page ? colors.primary : colors.white,
                      color: p === page ? colors.white : colors.text,
                      cursor: "pointer", fontSize: font.sm, fontWeight: p === page ? 600 : 400,
                    }}>
                    {p}
                  </button>
                ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "6px 14px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: font.sm, opacity: page === totalPages ? 0.5 : 1 }}>
                Next ›
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                style={{ padding: "6px 12px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: font.sm, opacity: page === totalPages ? 0.5 : 1 }}>
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
