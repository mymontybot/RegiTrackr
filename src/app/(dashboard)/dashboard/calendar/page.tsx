import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import type { FilingStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { FilingCalendarClient } from "@/components/calendar/FilingCalendarClient";
import { MainNav } from "@/components/dashboard/MainNav";
import { UserProfileButton } from "@/components/dashboard/UserProfileButton";
import prisma from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/services/auth.service";
import { DeadlineService } from "@/lib/services/deadline.service";

type CalendarPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type CalendarView = "month" | "list";

const LOOKAHEAD_OPTIONS = [30, 60, 90] as const;
const STATUS_OPTIONS: FilingStatus[] = ["UPCOMING", "PREPARED", "FILED", "CONFIRMED", "OVERDUE"];

function getParam(value: string | string[] | undefined, fallback = ""): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function toMonthKey(input: string): string {
  if (!/^\d{4}-\d{2}$/.test(input)) {
    return new Date().toISOString().slice(0, 7);
  }
  return input;
}

function toCalendarView(input: string): CalendarView {
  return input === "list" ? "list" : "month";
}

function toLookahead(input: string): 30 | 60 | 90 {
  const value = Number(input);
  if (LOOKAHEAD_OPTIONS.includes(value as 30 | 60 | 90)) {
    return value as 30 | 60 | 90;
  }
  return 30;
}

function toStatus(input: string): FilingStatus | undefined {
  if (STATUS_OPTIONS.includes(input as FilingStatus)) {
    return input as FilingStatus;
  }
  return undefined;
}

function monthRange(monthKey: string): { start: Date; end: Date } {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, (month ?? 1) - 1, 1);
  const end = new Date(year, (month ?? 1), 0, 23, 59, 59, 999);
  return { start, end };
}

function addMonthsToKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function createQuery(
  current: {
    view: CalendarView;
    month: string;
    lookahead: 30 | 60 | 90;
    clientId?: string;
    stateCode?: string;
    status?: FilingStatus;
    assignedStaffId?: string;
  },
  patch: Partial<{
    view: CalendarView;
    month: string;
    lookahead: 30 | 60 | 90;
    clientId: string;
    stateCode: string;
    status: FilingStatus;
    assignedStaffId: string;
  }>,
) {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  params.set("view", merged.view);
  params.set("month", merged.month);
  params.set("lookahead", String(merged.lookahead));
  if (merged.clientId) params.set("clientId", merged.clientId);
  if (merged.stateCode) params.set("state", merged.stateCode);
  if (merged.status) params.set("status", merged.status);
  if (merged.assignedStaffId) params.set("assignedStaffId", merged.assignedStaffId);
  return `/dashboard/calendar?${params.toString()}`;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const tenant = await getTenantContext(userId);
  const params = await searchParams;

  const view = toCalendarView(getParam(params.view, "month"));
  const month = toMonthKey(getParam(params.month, new Date().toISOString().slice(0, 7)));
  const lookahead = toLookahead(getParam(params.lookahead, "30"));
  const clientId = getParam(params.clientId).trim() || undefined;
  const stateCode = getParam(params.state).trim().toUpperCase() || undefined;
  const status = toStatus(getParam(params.status));
  const assignedStaffId = getParam(params.assignedStaffId).trim() || undefined;

  const now = new Date();
  const { start: monthStart, end: monthEnd } = monthRange(month);
  const listEnd = new Date(now);
  listEnd.setDate(now.getDate() + lookahead);
  listEnd.setHours(23, 59, 59, 999);

  const deadlineService = await DeadlineService.create(userId);
  const [clients, staff, states, filings, digest] = await Promise.all([
    prisma.client.findMany({
      where: { firmId: tenant.firmId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { firmId: tenant.firmId },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true },
    }),
    prisma.filingRecord.findMany({
      where: { firmId: tenant.firmId },
      distinct: ["stateCode"],
      orderBy: { stateCode: "asc" },
      select: { stateCode: true },
    }),
    deadlineService.getCalendarFilings({
      startDate: view === "month" ? monthStart : now,
      endDate: view === "month" ? monthEnd : listEnd,
      clientId,
      stateCode,
      status,
      assignedStaffId,
    }),
    deadlineService.getWeeklyDigestPreview(),
  ]);

  const currentQuery = {
    view,
    month,
    lookahead,
    clientId,
    stateCode,
    status,
    assignedStaffId,
  };

  return (
    <div className="flex min-h-screen bg-[#060B18]">
      <MainNav role={tenant.role} current="calendar" />

      <main className="ml-64 flex-1 min-w-0 space-y-6 p-6">
        <div className="flex items-center justify-between border-b border-[#1A2640] bg-[#0D1526] -mt-6 -mr-6 mb-6 h-14 px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Filing Calendar</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={createQuery(currentQuery, { view: "month" })}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${view === "month" ? "border-blue-500 bg-[rgba(59,130,246,0.1)] text-blue-400" : "border-[#2A3F66] text-slate-300 hover:bg-[#111D35] hover:text-slate-100"}`}
            >
              Month view
            </Link>
            <Link
              href={createQuery(currentQuery, { view: "list" })}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${view === "list" ? "border-blue-500 bg-[rgba(59,130,246,0.1)] text-blue-400" : "border-[#2A3F66] text-slate-300 hover:bg-[#111D35] hover:text-slate-100"}`}
            >
              List view
            </Link>
            <UserProfileButton />
          </div>
        </div>

        <p className="text-sm text-slate-500">Track deadlines by month or lookahead list.</p>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
          <form className="flex flex-1 flex-wrap items-end gap-3">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="lookahead" value={lookahead} />

            <div className="min-w-[220px]">
              <label htmlFor="clientId" className="mb-1.5 block text-xs font-medium text-slate-400">
                Client
              </label>
              <select
                id="clientId"
                name="clientId"
                defaultValue={clientId ?? ""}
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="">All clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[120px]">
              <label htmlFor="state" className="mb-1.5 block text-xs font-medium text-slate-400">
                State
              </label>
              <select
                id="state"
                name="state"
                defaultValue={stateCode ?? ""}
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="">All states</option>
                {states.map((state) => (
                  <option key={state.stateCode} value={state.stateCode}>
                    {state.stateCode}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[140px]">
              <label htmlFor="status" className="mb-1.5 block text-xs font-medium text-slate-400">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status ?? ""}
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
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
                defaultValue={assignedStaffId ?? ""}
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="">All staff</option>
                {staff.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name ?? user.email}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
            >
              Apply filters
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href={createQuery(currentQuery, { month: addMonthsToKey(month, -1) })}
              className="rounded-lg border border-[#2A3F66] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
            >
              Previous month
            </Link>
            <Link
              href={createQuery(currentQuery, { month: addMonthsToKey(month, 1) })}
              className="rounded-lg border border-[#2A3F66] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
            >
              Next month
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {LOOKAHEAD_OPTIONS.map((option) => (
              <Link
                key={option}
                href={createQuery(currentQuery, { lookahead: option, view: "list" })}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${lookahead === option && view === "list" ? "border-blue-500 bg-[rgba(59,130,246,0.1)] text-blue-400" : "border-[#2A3F66] text-slate-300 hover:bg-[#111D35] hover:text-slate-100"}`}
              >
                {option}d lookahead
              </Link>
            ))}
          </div>
        </div>

        <FilingCalendarClient
          view={view}
          month={month}
          lookahead={lookahead}
          filings={filings}
          weeklyDigestLines={digest}
        />
      </main>
    </div>
  );
}
