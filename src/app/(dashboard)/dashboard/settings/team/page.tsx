import { auth } from "@clerk/nextjs/server";
import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { InviteTeammateForm } from "@/components/settings/InviteTeammateForm";
import { RecentInvites } from "@/components/settings/RecentInvites";
import { InvitationService } from "@/lib/services/invitation.service";

const ROLE_CAPABILITIES: Array<{ role: UserRole; label: string; description: string }> = [
  {
    role: "FIRM_ADMIN",
    label: "Firm Admin",
    description: "Full firm administration: billing, team invites, roles, and all settings.",
  },
  {
    role: "MANAGER",
    label: "Manager",
    description: "Manage team assignments, workload, and operations; no billing or role changes.",
  },
  {
    role: "STAFF_ACCOUNTANT",
    label: "Staff Accountant",
    description: "Work on assigned clients: deadlines, alerts, filings, and narratives.",
  },
  {
    role: "READ_ONLY",
    label: "Read-Only",
    description: "View dashboards, reports, and client data only; no edits or assignments.",
  },
];

type TeamSettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeamSettingsPage({ searchParams }: TeamSettingsPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const params = await searchParams;
  const success = typeof params.invited === "string" && params.invited === "true";

  const invitationService = await InvitationService.create(userId);
  const invitations = await invitationService.listInvitations();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Team & Roles</h2>
        <p className="mt-1 text-sm text-slate-500">
          Invite teammates by email and assign a role. Role capabilities are listed below.
        </p>
      </div>

      <section className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
        <h3 className="text-base font-semibold text-slate-100">Invite Teammate</h3>
        <p className="mt-1 text-sm text-slate-500">
          Invites include the selected role so onboarding is scoped correctly.
        </p>
        <InviteTeammateForm success={success} />
      </section>

      <section className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
        <h3 className="text-base font-semibold text-slate-100">Role capabilities</h3>
        <p className="mt-1 text-sm text-slate-500">
          Immediate value: prevent risky actions by restricting sensitive operations to approved roles.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ROLE_CAPABILITIES.map((cap) => (
            <div
              key={cap.role}
              className="rounded-lg border border-[#1A2640] bg-[#111D35] p-4"
            >
              <p className="font-medium text-slate-100">{cap.label}</p>
              <p className="mt-1 text-sm text-slate-400">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
        <h3 className="text-base font-semibold text-slate-100">Recent invites</h3>
        <RecentInvites invitations={invitations} />
      </section>
    </div>
  );
}
