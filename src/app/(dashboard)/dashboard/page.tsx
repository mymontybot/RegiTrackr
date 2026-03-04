import { auth } from "@clerk/nextjs/server"
import type { NexusBand } from "@prisma/client"
import { redirect } from "next/navigation"
import { MainNav } from "@/components/dashboard/MainNav"
import { UserProfileButton } from "@/components/dashboard/UserProfileButton"
import { AddClientDrawer } from "@/components/clients/AddClientDrawer"
import { ClientTable } from "@/components/clients/ClientTable"
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
    <div className="flex min-h-screen bg-[#060B18]">
      <MainNav role={tenant.role} current="dashboard" />

      <main className="ml-64 flex-1 min-w-0 space-y-6 p-6">
        <div className="flex items-center justify-between border-b border-[#1A2640] bg-[#0D1526] -mt-6 -mr-6 mb-6 h-14 px-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Dashboard</h1>
          <div className="flex items-center gap-2">
            <UserProfileButton />
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div
            className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Total Active Clients</p>
            <p className="font-mono text-2xl font-bold text-slate-100 mt-1">{formatNumber(summary[0])}</p>
          </div>
          <div
            className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Total Entities</p>
            <p className="font-mono text-2xl font-bold text-slate-100 mt-1">{formatNumber(summary[1])}</p>
          </div>
          <div
            className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Deadlines This Month</p>
            <p className="font-mono text-2xl font-bold text-slate-100 mt-1">{formatNumber(summary[2])}</p>
          </div>
          <div
            className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Active Alerts</p>
            <p className="font-mono text-2xl font-bold text-[#F87171] mt-1">{formatNumber(summary[3])}</p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
            <form className="flex flex-1 flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <label htmlFor="search" className="mb-1.5 block text-xs font-medium text-slate-400">
                  Search client
                </label>
                <input
                  id="search"
                  name="search"
                  defaultValue={search}
                  placeholder="Search by client name"
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div className="min-w-[180px]">
                <label htmlFor="nexusBand" className="mb-1.5 block text-xs font-medium text-slate-400">
                  Nexus status
                </label>
                <select
                  id="nexusBand"
                  name="nexusBand"
                  defaultValue={nexusBand}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
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
                  className="mb-1.5 block text-xs font-medium text-slate-400"
                >
                  Assigned staff
                </label>
                <select
                  id="assignedStaffId"
                  name="assignedStaffId"
                  defaultValue={assignedStaffId}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
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
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
              >
                Apply filters
              </button>
            </form>
          </div>

          <div className="flex justify-end">
            <AddClientDrawer staffOptions={staffOptions} />
          </div>

          <ClientTable
            rows={clients.rows}
            page={clients.page}
            totalPages={clients.totalPages}
            total={clients.total}
            filters={{
              search: search || undefined,
              nexusBand,
              assignedStaffId: assignedStaffId || undefined,
            }}
          />
        </section>
      </main>
    </div>
  )
}
