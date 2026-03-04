import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MainNav } from "@/components/dashboard/MainNav";
import { UserProfileButton } from "@/components/dashboard/UserProfileButton";
import { getTenantContext } from "@/lib/services/auth.service";
import { ReassignDialog } from "@/components/team/ReassignDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkloadService } from "@/lib/services/workload.service";

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function workloadBadgeClass(score: number): string {
  if (score >= 16) return "bg-[#1C0505] text-[#F87171] border border-[#991B1B]";
  if (score >= 6) return "bg-[#1A1400] text-[#FDE047] border border-[#854D0E]";
  return "bg-[#052E16] text-[#4ADE80] border border-[#166534]";
}

export default async function TeamWorkloadPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const tenant = await getTenantContext(userId);
  if (tenant.role !== "FIRM_ADMIN") {
    redirect("/dashboard");
  }

  const service = await WorkloadService.create(userId);
  const workload = await service.getStaffWorkload(tenant.firmId);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex min-h-screen bg-[#060B18]">
      <MainNav role={tenant.role} current="team" />

      <main className="ml-64 flex-1 min-w-0 space-y-6 p-6">
        <div className="flex items-center justify-between border-b border-[#1A2640] bg-[#0D1526] -mt-6 -mr-6 mb-6 h-14 px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Team Workload</h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-500">{monthLabel}</p>
            <UserProfileButton />
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div
            className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Total Staff</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-100">{workload.totalStaff}</p>
          </div>
          <div
            className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Deadlines This Month</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-100">{workload.totalDeadlinesThisMonth}</p>
          </div>
          <div
            className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Total Overdue</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#F87171]">{workload.totalOverdue}</p>
          </div>
          <div
            className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Active Alerts</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-100">{workload.totalActiveAlerts}</p>
          </div>
        </section>

        {workload.unassignedClientCount > 0 ? (
          <Link
            href="/dashboard?assignedStaffId=unassigned"
            className="block rounded-lg border border-[#854D0E] bg-[#1A1400] px-4 py-3 text-sm text-[#FDE047]"
          >
            {workload.unassignedClientCount} clients ({workload.unassignedEntityCount} entities) have no assigned staff member. Assign them to track workload accurately.
          </Link>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-[#1E2D4A] bg-[#0D1526] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
          <Table className="w-full border-collapse text-sm">
            <TableHeader>
              <TableRow className="border-b border-[#1A2640]">
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Staff Member</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Clients</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Deadlines This Month</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Overdue</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Urgent Alerts</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Next Deadline</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Workload Score</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workload.staff.length === 0 ? (
                <TableRow className="border-b border-[#1A2640] hover:bg-transparent">
                  <TableCell colSpan={8} className="py-16 text-center text-slate-500">
                    No staff members with assigned clients
                  </TableCell>
                </TableRow>
              ) : null}

              {workload.staff.map((row, index) => (
                <TableRow key={row.userId} className={`border-b border-[#1A2640] transition-colors hover:bg-[#111D35] ${index % 2 === 1 ? "bg-[#0A1020]" : ""}`}>
                  <TableCell className="px-4 py-2.5">
                    <Link href={`/dashboard?assignedStaffId=${row.userId}`} className="font-medium text-slate-100 underline-offset-4 hover:underline">
                      {row.userName}
                    </Link>
                    <p className="text-xs text-slate-500">{row.userEmail}</p>
                  </TableCell>
                  <TableCell className="px-4 py-2.5 font-mono text-slate-300">{row.assignedClientCount}</TableCell>
                  <TableCell className="px-4 py-2.5 font-mono text-slate-300">{row.deadlinesThisMonth}</TableCell>
                  <TableCell className={`px-4 py-2.5 font-mono ${row.overdueCount > 0 ? "font-semibold text-[#F87171]" : "text-slate-300"}`}>
                    {row.overdueCount}
                  </TableCell>
                  <TableCell className="px-4 py-2.5 font-mono text-slate-300">{row.urgentAlertCount}</TableCell>
                  <TableCell className="px-4 py-2.5 font-mono text-xs text-slate-400">{formatDate(row.nextDeadline)}</TableCell>
                  <TableCell className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium font-mono ${workloadBadgeClass(row.workloadScore)}`}>
                      {row.workloadScore}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-2.5 text-right">
                    <ReassignDialog
                      fromUserId={row.userId}
                      fromUserLabel={row.userName}
                      staffOptions={workload.staff.map((staff) => ({
                        id: staff.userId,
                        name: staff.userName,
                        email: staff.userEmail,
                      }))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </main>
    </div>
  );
}
