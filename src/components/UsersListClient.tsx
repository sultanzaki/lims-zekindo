"use client";

import { useMemo, useState } from "react";
import CreateUserForm from "@/components/CreateUserForm";
import ResetPasswordButton from "@/components/ResetPasswordButton";
import StatChip from "@/components/ui/StatChip";
import { setUserActiveAction } from "@/lib/actions/admin-users";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  isAdmin: boolean;
  active: boolean;
};

export default function UsersListClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);

  const roles = useMemo(() => ["All", ...Array.from(new Set(users.map((u) => u.roleLabel))).sort()], [users]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.active).length;
    const inactive = users.length - active;
    const admins = users.filter((u) => u.isAdmin).length;
    return { active, inactive, admins };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "All" && u.roleLabel !== roleFilter) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, search, roleFilter]);

  return (
    <div className="flex-1 px-5 md:px-9 pt-4.5 md:pt-7 pb-7 md:pb-9 flex flex-col gap-3.5 md:gap-5 md:max-w-[1200px] md:w-full">
      {/* Desktop header + toolbar */}
      <div className="hidden md:flex md:items-start md:justify-between md:gap-6 md:pr-10">
        <div>
          <div className="text-[20px] font-bold text-text tracking-tight">Users</div>
          <div className="text-[13px] text-muted mt-0.5">
            {users.length} accounts &middot; {stats.active} active
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 h-[38px] px-3 rounded-[10px] bg-white border border-border w-[220px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#93A6B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="border-none bg-transparent text-[13px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-[38px] px-3 rounded-[10px] bg-white border border-border text-[13px] font-semibold text-[#5B6B74] cursor-pointer"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r === "All" ? "All roles" : r}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-glow-primary cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {formOpen ? "Close" : "Add User"}
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="hidden md:block md:max-w-[640px]">
          <CreateUserForm />
        </div>
      )}

      {/* Mobile: always-visible create form (unchanged) */}
      <div className="md:hidden">
        <CreateUserForm />
      </div>

      {/* Desktop stat strip */}
      <div className="hidden md:flex md:gap-2.5">
        <StatChip label="Total accounts" value={users.length} />
        <StatChip label="Active" value={stats.active} dotColor="#28A745" />
        <StatChip label="Inactive" value={stats.inactive} dotColor="#D0021B" />
        <StatChip label="Admins" value={stats.admins} />
      </div>

      {/* Mobile card feed (unchanged) */}
      <div className="flex flex-col gap-2 md:hidden">
        {users.map((u) => (
          <div key={u.id} className="bg-white border border-border rounded-2xl shadow-card-sm p-3.5 flex items-center justify-between gap-2">
            <div>
              <div className="text-[13px] font-semibold text-text">
                {u.name} {!u.active && <span className="text-danger font-normal">(inactive)</span>}
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                {u.email} · {u.roleLabel}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <ResetPasswordButton userId={u.id} />
              <form action={setUserActiveAction.bind(null, u.id, !u.active)}>
                <button type="submit" className={`text-[11px] font-semibold cursor-pointer ${u.active ? "text-danger" : "text-success-dark"}`}>
                  {u.active ? "Deactivate" : "Reactivate"}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-border rounded-2xl shadow-card-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left border-collapse">
            <thead>
              <tr className="border-b border-border-soft">
                <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-4">Name</th>
                <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Email</th>
                <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Role</th>
                <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Status</th>
                <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className={`border-b border-border-soft last:border-b-0 hover:bg-chip-bg transition-colors ${!u.active ? "bg-danger-bg" : ""}`}>
                  <td className="py-2.5 px-4 text-[13px] font-semibold text-text">{u.name}</td>
                  <td className="py-2.5 px-3 text-[13px] text-muted">{u.email}</td>
                  <td className="py-2.5 px-3 text-[13px] text-muted">{u.roleLabel}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={{
                        background: u.active ? "#E6F4EA" : "#FDECEA",
                        color: u.active ? "#1E7A34" : "#B00016",
                      }}
                    >
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 pr-4">
                    <div className="flex items-center gap-3">
                      <ResetPasswordButton userId={u.id} />
                      <form action={setUserActiveAction.bind(null, u.id, !u.active)}>
                        <button type="submit" className={`text-[11px] font-semibold cursor-pointer ${u.active ? "text-danger" : "text-success-dark"}`}>
                          {u.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-muted">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
