import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MainNav } from "@/components/dashboard/MainNav";
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
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function workloadBadgeClass(score: number): string {
  if (score >= 16) return "bg-red-100 text-red-800";
  if (score >= 6) return "bg-amber-100 text-amber-800";
  return "bg-green-100 text-green-800";
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
    <main className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
      <MainNav role={tenant.role} current="team" />

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Team Workload</h1>
        <p className="text-sm text-muted-foreground">{monthLabel}</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Staff</p>
          <p className="mt-1 text-2xl font-semibold">{workload.totalStaff}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Deadlines This Month</p>
          <p className="mt-1 text-2xl font-semibold">{workload.totalDeadlinesThisMonth}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Overdue</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{workload.totalOverdue}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Active Alerts</p>
          <p className="mt-1 text-2xl font-semibold">{workload.totalActiveAlerts}</p>
        </div>
      </section>

      {workload.unassignedClientCount > 0 ? (
        <Link
          href="/dashboard?assignedStaffId=unassigned"
          className="block rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {workload.unassignedClientCount} clients ({workload.unassignedEntityCount} entities) have no assigned staff member — assign them to track workload accurately
        </Link>
      ) : null}

      <section className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Clients</TableHead>
              <TableHead>Deadlines This Month</TableHead>
              <TableHead>Overdue</TableHead>
              <TableHead>Urgent Alerts</TableHead>
              <TableHead>Next Deadline</TableHead>
              <TableHead>Workload Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workload.staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No staff members with assigned clients
                </TableCell>
              </TableRow>
            ) : null}

            {workload.staff.map((row) => (
              <TableRow key={row.userId}>
                <TableCell>
                  <Link href={`/dashboard?assignedStaffId=${row.userId}`} className="font-medium underline-offset-4 hover:underline">
                    {row.userName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                </TableCell>
                <TableCell>{row.assignedClientCount}</TableCell>
                <TableCell>{row.deadlinesThisMonth}</TableCell>
                <TableCell className={row.overdueCount > 0 ? "text-red-600 font-semibold" : ""}>
                  {row.overdueCount}
                </TableCell>
                <TableCell>{row.urgentAlertCount}</TableCell>
                <TableCell>{formatDate(row.nextDeadline)}</TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${workloadBadgeClass(row.workloadScore)}`}>
                    {row.workloadScore}
                  </span>
                </TableCell>
                <TableCell className="text-right">
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
  );
}
