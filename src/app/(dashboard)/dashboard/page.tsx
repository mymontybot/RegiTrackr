import { auth } from "@clerk/nextjs/server"
import type { BillingTier, NexusBand } from "@prisma/client"
import { redirect } from "next/navigation"
import { MainNav } from "@/components/dashboard/MainNav"
import { ClientTable } from "@/components/clients/ClientTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import prisma from "@/lib/db/prisma"
import { getTenantContext } from "@/lib/services/auth.service"
import { ClientService } from "@/lib/services/client.service"

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const NEXUS_FILTERS: Array<{ value: NexusBand | "ALL"; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "SAFE", label: "Safe" },
  { value: "WARNING", label: "Warning" },
  { value: "URGENT", label: "Urgent" },
  { value: "TRIGGERED", label: "Triggered" },
  { value: "REGISTERED", label: "Registered" },
]

function getParam(
  value: string | string[] | undefined,
  fallback = "",
): string {
  if (Array.isArray(value)) return value[0] ?? fallback
  return value ?? fallback
}

function toNexusBand(value: string): NexusBand | "ALL" {
  const valid = ["ALL", "SAFE", "WARNING", "URGENT", "TRIGGERED", "REGISTERED"] as const
  if (valid.includes(value as (typeof valid)[number])) {
    return value as NexusBand | "ALL"
  }
  return "ALL"
}

function toPositiveInt(value: string, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }

  const tenant = await getTenantContext(userId)
  const params = await searchParams

  const search = getParam(params.search).trim()
  const nexusBand = toNexusBand(getParam(params.nexusBand, "ALL"))
  const assignedStaffId = getParam(params.assignedStaffId).trim()
  const page = toPositiveInt(getParam(params.page, "1"), 1)

  const [summary, staffOptions, clients] = await Promise.all([
    prisma.$transaction([
      prisma.client.count({ where: { firmId: tenant.firmId } }),
      prisma.entity.count({ where: { firmId: tenant.firmId } }),
      prisma.filingRecord.count({
        where: {
          firmId: tenant.firmId,
          dueDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
          status: { in: ["UPCOMING", "PREPARED", "OVERDUE"] },
        },
      }),
      prisma.alert.count({
        where: { firmId: tenant.firmId, isSnoozed: false },
      }),
    ]),
    prisma.user.findMany({
      where: { firmId: tenant.firmId },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true },
    }),
    ClientService.create(userId).then((service) =>
      service.getClients({
        search: search || undefined,
        nexusBand,
        assignedStaffId: assignedStaffId || undefined,
        page,
        pageSize: 25,
      }),
    ),
  ])

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
      <MainNav role={tenant.role} current="dashboard" />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(summary[0])}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Entities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(summary[1])}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deadlines This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(summary[2])}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-600">{formatNumber(summary[3])}</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
          <form className="flex flex-1 flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label htmlFor="search" className="mb-1 block text-xs font-medium text-muted-foreground">
                Search client
              </label>
              <input
                id="search"
                name="search"
                defaultValue={search}
                placeholder="Search by client name"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="min-w-[180px]">
              <label htmlFor="nexusBand" className="mb-1 block text-xs font-medium text-muted-foreground">
                Nexus status
              </label>
              <select
                id="nexusBand"
                name="nexusBand"
                defaultValue={nexusBand}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {NEXUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[220px]">
              <label
                htmlFor="assignedStaffId"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Assigned staff
              </label>
              <select
                id="assignedStaffId"
                name="assignedStaffId"
                defaultValue={assignedStaffId}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">All staff</option>
                <option value="unassigned">Unassigned clients</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name ?? staff.email}
                  </option>
                ))}
              </select>
            </div>

            <input type="hidden" name="page" value="1" />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Apply filters
            </button>
          </form>
        </div>

        <ClientTable
          rows={clients.rows}
          page={clients.page}
          totalPages={clients.totalPages}
          total={clients.total}
          currentTier={tenant.billingTier as BillingTier}
          filters={{
            search: search || undefined,
            nexusBand,
            assignedStaffId: assignedStaffId || undefined,
          }}
        />
      </section>
    </main>
  )
}
