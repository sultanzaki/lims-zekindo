"use client";

import { useActionState } from "react";
import { createUserAction, type FormState } from "@/lib/actions/admin-users";
import { ACCESS_ROLES, ROLE_LABELS } from "@/lib/roles";
import { inputClassSm } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

export default function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 bg-white border border-border rounded-[18px] shadow-card p-4">
      <div className="text-[13px] font-semibold text-text">Add User</div>
      <div className="grid grid-cols-2 gap-2.5">
        <MiniField label="Full Name" name="name" placeholder="Andi Wijaya" />
        <MiniField label="Employee ID" name="employeeId" placeholder="EMP-2099" />
        <MiniField label="Email" name="email" placeholder="a.name@lab.local" type="email" />
        <MiniField label="Job Title" name="role" placeholder="Lab Technician" />
        <MiniField label="Section" name="section" placeholder="Microbiology" />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-text">Access Role</label>
          <select name="accessRole" defaultValue="TECHNICIAN" className={inputClassSm}>
            {ACCESS_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && <div className="text-xs font-medium text-danger">{state.error}</div>}
      {state.tempPassword && (
        <div className="text-xs font-medium text-success-dark bg-success-bg border border-success/30 rounded-[13px] p-3">
          User created. Temporary password (share with them once, they should change it):{" "}
          <strong>{state.tempPassword}</strong>
        </div>
      )}

      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Creating…" : "Create User"}
      </Button>
    </form>
  );
}

function MiniField({ label, name, placeholder, type = "text" }: { label: string; name: string; placeholder: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-text">{label}</label>
      <input name={name} type={type} placeholder={placeholder} className={inputClassSm} />
    </div>
  );
}
