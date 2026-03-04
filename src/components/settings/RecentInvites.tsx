import type { InvitationRow } from "@/lib/services/invitation.service";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    FIRM_ADMIN: "Firm Admin",
    MANAGER: "Manager",
    STAFF_ACCOUNTANT: "Staff Accountant",
    READ_ONLY: "Read-Only",
  };
  return map[role] ?? role;
}

type RecentInvitesProps = {
  invitations: InvitationRow[];
};

export function RecentInvites({ invitations }: RecentInvitesProps) {
  if (invitations.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">No invites sent yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-2">
      {invitations.map((inv) => (
        <li
          key={inv.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1A2640] bg-[#111D35] px-4 py-3 text-sm"
        >
          <div>
            <span className="font-medium text-slate-100">{inv.email}</span>
            <span className="mx-2 text-slate-500">·</span>
            <span className="text-slate-400">{roleLabel(inv.role)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {inv.invitedByName ? <span>Invited by {inv.invitedByName}</span> : null}
            <span className="font-mono">{formatDate(inv.createdAt)}</span>
            <span
              className={
                inv.status === "PENDING"
                  ? "text-[#FDE047]"
                  : inv.status === "ACCEPTED"
                    ? "text-[#4ADE80]"
                    : "text-slate-500"
              }
            >
              {inv.status}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
