"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserRole } from "@prisma/client";

function roleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    FIRM_ADMIN: "Firm Admin",
    MANAGER: "Manager",
    STAFF_ACCOUNTANT: "Staff Accountant",
    READ_ONLY: "Read-Only",
  };
  return map[role] ?? role;
}

type AcceptInviteClientProps = {
  token: string;
  firmName: string;
  role: UserRole;
  email: string;
};

export function AcceptInviteClient({ token, firmName, role, email }: AcceptInviteClientProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to accept");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-foreground">Join {firmName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You’ve been invited to join as <strong>{roleLabel(role)}</strong>. This invite was sent to {email}.
      </p>
      <button
        type="button"
        onClick={handleAccept}
        disabled={pending}
        className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {pending ? "Accepting…" : "Accept invitation"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
