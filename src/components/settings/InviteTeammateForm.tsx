"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserRole } from "@prisma/client";

const ROLES: Array<{ value: UserRole; label: string }> = [
  { value: "READ_ONLY", label: "Read-Only" },
  { value: "STAFF_ACCOUNTANT", label: "Staff Accountant" },
  { value: "MANAGER", label: "Manager" },
  { value: "FIRM_ADMIN", label: "Firm Admin" },
];

type InviteTeammateFormProps = {
  success?: boolean;
};

export function InviteTeammateForm({ success }: InviteTeammateFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("STAFF_ACCOUNTANT");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/settings/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to send invite");
        return;
      }
      setEmail("");
      router.push("/dashboard/settings/team?invited=true");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-4">
      <div className="min-w-[240px] flex-1">
        <label htmlFor="invite-email" className="mb-1.5 block text-xs font-medium text-slate-400">
          Work email
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          required
          className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
        />
      </div>
      <div className="min-w-[180px]">
        <label htmlFor="invite-role" className="mb-1.5 block text-xs font-medium text-slate-400">
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send Invite"}
      </button>
      {success ? (
        <p className="text-sm text-[#4ADE80]">Invite sent. They will receive an email with a link to join.</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
