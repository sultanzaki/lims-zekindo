"use client";

import { useActionState } from "react";
import { createUserAction, type FormState } from "@/lib/actions/admin-users";
import { ACCESS_ROLES, ROLE_LABELS } from "@/lib/roles";

const initialState: FormState = {};

export default function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 bg-white border border-border rounded-xl p-4">
      <div className="text-[13px] font-semibold text-text">Add User</div>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Full Name" name="name" placeholder="Andi Wijaya" />
        <Field label="Employee ID" name="employeeId" placeholder="EMP-2099" />
        <Field label="Email" name="email" placeholder="a.name@lab.local" type="email" />
        <Field label="Job Title" name="role" placeholder="Lab Technician" />
        <Field label="Section" name="section" placeholder="Microbiology" />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-text">Access Role</label>
          <select
            name="accessRole"
            defaultValue="TECHNICIAN"
            className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
          >
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
        <div className="text-xs font-medium text-success-dark bg-success-bg border border-success rounded-lg p-2.5">
          User created. Temporary password (share with them once, they should change it):{" "}
          <strong>{state.tempPassword}</strong>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-white rounded-full py-2.5 text-xs font-semibold cursor-pointer disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create User"}
      </button>
    </form>
  );
}

function Field({ label, name, placeholder, type = "text" }: { label: string; name: string; placeholder: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-text">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
      />
    </div>
  );
}
