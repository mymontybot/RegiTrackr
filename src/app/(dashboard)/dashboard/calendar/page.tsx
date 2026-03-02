import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import type { FilingStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { FilingCalendarClient, STATUS_OPTIONS } from "@/components/calendar/FilingCalendarClient";
import { MainNav } from "@/components/dashboard/MainNav";
import prisma from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/services/auth.service";
import { DeadlineService } from "@/lib/services/deadline.service";

type CalendarPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type CalendarView = "month" | "list";

const LOOKAHEAD_OPTIONS = [30, 60, 90] as const;

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
    <main className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
      <MainNav role={tenant.role} current="calendar" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Filing Calendar</h1>
          <p className="text-sm text-muted-foreground">Track deadlines by month or lookahead list.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={createQuery(currentQuery, { view: "month" })}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${view === "month" ? "bg-muted" : ""}`}
          >
            Month view
          </Link>
          <Link
            href={createQuery(currentQuery, { view: "list" })}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${view === "list" ? "bg-muted" : ""}`}
          >
            List view
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <form className="flex flex-1 flex-wrap items-end gap-3">
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="lookahead" value={lookahead} />

          <div className="min-w-[220px]">
            <label htmlFor="clientId" className="mb-1 block text-xs font-medium text-muted-foreground">
              Client
            </label>
            <select
              id="clientId"
              name="clientId"
              defaultValue={clientId ?? ""}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
            <label htmlFor="state" className="mb-1 block text-xs font-medium text-muted-foreground">
              State
            </label>
            <select
              id="state"
              name="state"
              defaultValue={stateCode ?? ""}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
            <label htmlFor="status" className="mb-1 block text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status ?? ""}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Assigned staff
            </label>
            <select
              id="assignedStaffId"
              name="assignedStaffId"
              defaultValue={assignedStaffId ?? ""}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Apply filters
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={createQuery(currentQuery, { month: addMonthsToKey(month, -1) })}
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Previous month
          </Link>
          <Link
            href={createQuery(currentQuery, { month: addMonthsToKey(month, 1) })}
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Next month
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {LOOKAHEAD_OPTIONS.map((option) => (
            <Link
              key={option}
              href={createQuery(currentQuery, { lookahead: option, view: "list" })}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${lookahead === option && view === "list" ? "bg-muted" : ""}`}
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
  );
}
