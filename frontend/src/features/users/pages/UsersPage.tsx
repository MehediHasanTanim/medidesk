import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import { usersApi, type CreateUserPayload, type UpdateUserPayload } from "@/features/users/api/usersApi";
import { chambersApi } from "@/features/chambers/api/chambersApi";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { ROLE_LABELS, ROLE_COLORS, ALL_ROLES } from "@/shared/types/auth";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { UserRecord, UserRole } from "@/shared/types/auth";

const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: `1px solid ${colors.border}`, borderRadius: radius.md,
  fontSize: font.base, boxSizing: "border-box" as const,
  color: colors.text, background: colors.bg,
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span style={{
      background: ROLE_COLORS[role], color: colors.white,
      padding: "2px 10px", borderRadius: 999,
      fontSize: "12px", fontWeight: 600,
    }}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user: currentUser } = useAuthStore();
  // super_admin can assign any role; admin cannot create super_admin accounts
  const availableRoles: UserRole[] = currentUser?.role === "super_admin"
    ? ALL_ROLES
    : ALL_ROLES.filter((r) => r !== "super_admin");

  const [form, setForm] = useState<CreateUserPayload>({
    username: "", full_name: "", email: "", role: "receptionist", password: "", chamber_ids: [],
  });
  const [error, setError] = useState("");

  const { data: chambers = [] } = useQuery({
    queryKey: ["chambers"],
    queryFn: () => chambersApi.list(),
  });

  const create = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { onCreated(); onClose(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Failed to create user.");
    },
  });

  const set = (key: keyof CreateUserPayload, value: string | string[]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, padding: 32, width: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: shadow.lg }}>
        <h3 style={{ margin: "0 0 20px", fontSize: font.lg, fontWeight: 600 }}>Create User</h3>

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 14px", borderRadius: radius.md, marginBottom: 16, fontSize: font.base }}>{error}</div>}

        {(["username", "full_name", "email"] as const).map((field) => (
          <div key={field} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base, textTransform: "capitalize" }}>
              {field.replace("_", " ")}
            </label>
            <input type={field === "email" ? "email" : "text"} value={form[field]} onChange={(e) => set(field, e.target.value)} style={inputStyle} />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Role</label>
          <select value={form.role} onChange={(e) => set("role", e.target.value)} style={inputStyle}>
            {availableRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Password</label>
          <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} style={inputStyle} />
        </div>

        {chambers.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Chambers (optional)</label>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: 10, maxHeight: 140, overflowY: "auto" }}>
              {chambers.map((c) => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.chamber_ids?.includes(c.id) ?? false}
                    onChange={(e) => {
                      const ids = form.chamber_ids ?? [];
                      set("chamber_ids", e.target.checked ? [...ids, c.id] : ids.filter((i) => i !== c.id));
                    }}
                  />
                  <span style={{ fontSize: font.base }}>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", background: colors.borderLight, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}>Cancel</button>
          <button onClick={() => create.mutate(form)} disabled={create.isPending} style={{ padding: "8px 18px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}>
            {create.isPending ? "Creating…" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: UserRecord; onClose: () => void; onSaved: () => void }) {
  const { user: currentUser } = useAuthStore();
  const availableRoles: UserRole[] = currentUser?.role === "super_admin"
    ? ALL_ROLES
    : ALL_ROLES.filter((r) => r !== "super_admin");

  const [form, setForm] = useState<UpdateUserPayload>({
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    chamber_ids: user.chamber_ids,
  });
  const [error, setError] = useState("");

  const { data: chambers = [] } = useQuery({
    queryKey: ["chambers"],
    queryFn: () => chambersApi.list(),
  });

  const update = useMutation({
    mutationFn: (payload: UpdateUserPayload) => usersApi.update(user.id, payload),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Failed to update user.");
    },
  });

  const set = (key: keyof UpdateUserPayload, value: string | string[]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, padding: 32, width: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: shadow.lg }}>
        <h3 style={{ margin: "0 0 4px", fontSize: font.lg, fontWeight: 600 }}>Edit User</h3>
        <p style={{ margin: "0 0 20px", color: colors.textMuted, fontSize: font.sm }}>@{user.username}</p>

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 14px", borderRadius: radius.md, marginBottom: 16, fontSize: font.base }}>{error}</div>}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Full Name</label>
          <input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Email</label>
          <input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Role</label>
          <select value={form.role ?? ""} onChange={(e) => set("role", e.target.value)} style={inputStyle}>
            {availableRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        {chambers.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Chambers</label>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: 10, maxHeight: 140, overflowY: "auto" }}>
              {chambers.map((c) => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.chamber_ids?.includes(c.id) ?? false}
                    onChange={(e) => {
                      const ids = form.chamber_ids ?? [];
                      set("chamber_ids", e.target.checked ? [...ids, c.id] : ids.filter((i) => i !== c.id));
                    }}
                  />
                  <span style={{ fontSize: font.base }}>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", background: colors.borderLight, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}>Cancel</button>
          <button onClick={() => update.mutate(form)} disabled={update.isPending} style={{ padding: "8px 18px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}>
            {update.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

// Columns that support server-side sorting and their ORM field names
const SORTABLE_COLUMNS = [
  { label: "Name",     field: "full_name"  },
  { label: "Username", field: "username"   },
  { label: "Email",    field: "email"      },
  { label: "Role",     field: "role"       },
  { label: "Status",   field: "is_active"  },
] as const;

type SortField = typeof SORTABLE_COLUMNS[number]["field"];

function SortIcon({ field, ordering }: { field: SortField; ordering: string }) {
  if (ordering === field) return <span style={{ marginLeft: 4 }}>↑</span>;
  if (ordering === `-${field}`) return <span style={{ marginLeft: 4 }}>↓</span>;
  return <span style={{ marginLeft: 4, opacity: 0.3 }}>↕</span>;
}

export default function UsersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState<string>("full_name");
  const qc = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce: fire query 300 ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const handleFilterChange = (val: boolean | undefined) => {
    setFilterActive(val);
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    setOrdering((prev) => (prev === field ? `-${field}` : field));
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["users", filterActive, search, page, ordering],
    queryFn: () => usersApi.list({
      is_active: filterActive,
      search: search || undefined,
      page,
      page_size: PAGE_SIZE,
      ordering,
    }),
  });

  const users = data?.results ?? [];
  const totalPages = data?.total_pages ?? 1;
  const totalCount = data?.count ?? 0;

  const deactivate = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => usersApi.update(id, { is_active: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>Users</h1>
            <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
              Manage staff accounts and role assignments
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ padding: "9px 20px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}
          >
            + Add User
          </button>
        </div>

        {/* Toolbar: filter tabs + search */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 2, background: colors.borderLight, borderRadius: radius.md, padding: 4 }}>
            {([["Active", true], ["All", undefined], ["Inactive", false]] as const).map(([label, val]) => (
              <button
                key={label}
                onClick={() => handleFilterChange(val as boolean | undefined)}
                style={{
                  padding: "6px 16px", border: "none", borderRadius: radius.sm, cursor: "pointer",
                  fontSize: font.base, fontWeight: 500,
                  background: filterActive === val ? colors.white : "transparent",
                  color: filterActive === val ? colors.primary : colors.textMuted,
                  boxShadow: filterActive === val ? shadow.sm : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
            <input
              placeholder="Search by name, username or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: "100%", padding: "8px 36px 8px 12px", borderRadius: radius.md, border: `1px solid ${colors.border}`, fontSize: font.base, outline: "none", boxSizing: "border-box" }}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: colors.textMuted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2 }}
              >
                ✕
              </button>
            )}
          </div>

          {!isLoading && (
            <span style={{ color: colors.textMuted, fontSize: font.sm, marginLeft: "auto" }}>
              {totalCount} user{totalCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Table */}
        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>Loading users…</div>
          ) : users.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>
              {search ? `No users found for "${search}".` : "No users found."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: colors.bg }}>
                  {SORTABLE_COLUMNS.map(({ label, field }) => (
                    <th
                      key={field}
                      onClick={() => handleSort(field)}
                      style={{
                        padding: "12px 16px", textAlign: "left", fontSize: font.sm,
                        fontWeight: 600, color: colors.textMuted,
                        borderBottom: `1px solid ${colors.border}`,
                        cursor: "pointer", userSelect: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                      <SortIcon field={field} ordering={ordering} />
                    </th>
                  ))}
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: font.sm, fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: UserRecord) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: ROLE_COLORS[u.role], display: "flex", alignItems: "center", justifyContent: "center", color: colors.white, fontWeight: 700, fontSize: font.sm, flexShrink: 0 }}>
                          {u.full_name[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, color: colors.text, fontSize: font.base }}>{u.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: colors.textMuted, fontSize: font.base }}>{u.username}</td>
                    <td style={{ padding: "12px 16px", color: colors.textMuted, fontSize: font.base }}>{u.email || "—"}</td>
                    <td style={{ padding: "12px 16px" }}><RoleBadge role={u.role} /></td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: "12px", fontWeight: 600, background: u.is_active ? "#dcfce7" : "#fee2e2", color: u.is_active ? "#166534" : "#991b1b" }}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setEditUser(u)}
                          style={{ padding: "4px 12px", background: colors.primaryLight, color: colors.primary, border: `1px solid #bfdbfe`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                        >
                          Edit
                        </button>
                        {u.is_active ? (
                          <button
                            onClick={() => { if (confirm(`Deactivate ${u.full_name}?`)) deactivate.mutate(u.id); }}
                            style={{ padding: "4px 12px", background: "#fef2f2", color: colors.danger, border: `1px solid #fecaca`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => { if (confirm(`Reactivate ${u.full_name}?`)) reactivate.mutate(u.id); }}
                            style={{ padding: "4px 12px", background: "#f0fdf4", color: colors.success, border: `1px solid #bbf7d0`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <span style={{ color: colors.textMuted, fontSize: font.sm }}>
              Page {page} of {totalPages} · {totalCount} total
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                style={{ padding: "6px 12px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: page === 1 ? "not-allowed" : "pointer", fontSize: font.sm, color: page === 1 ? colors.textMuted : colors.text, opacity: page === 1 ? 0.5 : 1 }}
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: "6px 14px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: page === 1 ? "not-allowed" : "pointer", fontSize: font.sm, color: page === 1 ? colors.textMuted : colors.text, opacity: page === 1 ? 0.5 : 1 }}
              >
                ‹ Prev
              </button>
              {/* Page number buttons — show at most 5 around current */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 2)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{ padding: "6px 12px", border: `1px solid ${p === page ? colors.primary : colors.border}`, borderRadius: radius.md, background: p === page ? colors.primary : colors.white, color: p === page ? colors.white : colors.text, cursor: "pointer", fontSize: font.sm, fontWeight: p === page ? 600 : 400 }}
                  >
                    {p}
                  </button>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: "6px 14px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: font.sm, color: page === totalPages ? colors.textMuted : colors.text, opacity: page === totalPages ? 0.5 : 1 }}
              >
                Next ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                style={{ padding: "6px 12px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: font.sm, color: page === totalPages ? colors.textMuted : colors.text, opacity: page === totalPages ? 0.5 : 1 }}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["users"] })}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["users"] })}
        />
      )}
    </AppShell>
  );
}
