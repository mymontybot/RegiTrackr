import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import type { AlertType, NexusBand } from "@prisma/client";
import { redirect } from "next/navigation";
import { AlertsTable } from "@/components/alerts/AlertsTable";
import { MainNav } from "@/components/dashboard/MainNav";
import prisma from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/services/auth.service";
import { NexusService, type AlertCenterSort, type AlertCenterTab } from "@/lib/services/nexus.service";

type AlertsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ALERT_TYPE_OPTIONS: AlertType[] = [
  "WARNING_70",
  "URGENT_90",
  "TRIGGERED_100",
  "TRIGGERED_NOT_REGISTERED",
  "OVERDUE_FILING",
];

const URGENCY_OPTIONS: NexusBand[] = ["SAFE", "WARNING", "URGENT", "TRIGGERED", "REGISTERED"];

function getParam(value: string | string[] | undefined, fallback = ""): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function toTab(value: string): AlertCenterTab {
  return value === "snoozed" ? "snoozed" : "active";
}

function toSort(value: string): AlertCenterSort {
  return value === "newest" ? "newest" : "most_urgent";
}

function toAlertType(value: string): AlertType | undefined {
  if (ALERT_TYPE_OPTIONS.includes(value as AlertType)) {
    return value as AlertType;
  }
  return undefined;
}

function toUrgency(value: string): NexusBand | undefined {
  if (URGENCY_OPTIONS.includes(value as NexusBand)) {
    return value as NexusBand;
  }
  return undefined;
}

function buildQuery(params: {
  tab: AlertCenterTab;
  alertType?: AlertType;
  clientId?: string;
  state?: string;
  urgency?: NexusBand;
  sort: AlertCenterSort;
}) {
  const query = new URLSearchParams();
  query.set("tab", params.tab);
  query.set("sort", params.sort);
  if (params.alertType) query.set("alertType", params.alertType);
  if (params.clientId) query.set("clientId", params.clientId);
  if (params.state) query.set("state", params.state);
  if (params.urgency) query.set("urgency", params.urgency);
  return `/dashboard/alerts?${query.toString()}`;
}

export default async function AlertsCenterPage({ searchParams }: AlertsPageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const tenant = await getTenantContext(userId);
  const params = await searchParams;

  const tab = toTab(getParam(params.tab, "active"));
  const sort = toSort(getParam(params.sort, "most_urgent"));
  const alertType = toAlertType(getParam(params.alertType));
  const clientId = getParam(params.clientId).trim() || undefined;
  const stateCode = getParam(params.state).trim().toUpperCase() || undefined;
  const urgency = toUrgency(getParam(params.urgency));

  const nexusService = await NexusService.create(userId);
  const [clients, states, alerts] = await Promise.all([
    prisma.client.findMany({
      where: { firmId: tenant.firmId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.alert.findMany({
      where: { firmId: tenant.firmId },
      distinct: ["stateCode"],
      orderBy: { stateCode: "asc" },
      select: { stateCode: true },
    }),
    nexusService.getAlertsForCenter({
      tab,
      sort,
      alertType,
      clientId,
      stateCode,
      urgency,
    }),
  ]);

  const current = {
    tab,
    sort,
    alertType,
    clientId,
    state: stateCode,
    urgency,
  };

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
      <MainNav role={tenant.role} current="alerts" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Alerts Center</h1>
          <p className="text-sm text-muted-foreground">
            All alerts across clients with filtering, sorting, and bulk snooze actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={buildQuery({ ...current, tab: "active" })}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${tab === "active" ? "bg-muted" : ""}`}
          >
            Active alerts
          </Link>
          <Link
            href={buildQuery({ ...current, tab: "snoozed" })}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${tab === "snoozed" ? "bg-muted" : ""}`}
          >
            Snoozed alerts
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="tab" value={tab} />

          <div className="min-w-[200px]">
            <label htmlFor="alertType" className="mb-1 block text-xs font-medium text-muted-foreground">
              Alert type
            </label>
            <select
              id="alertType"
              name="alertType"
              defaultValue={alertType ?? ""}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">All types</option>
              {ALERT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

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

          <div className="min-w-[160px]">
            <label htmlFor="urgency" className="mb-1 block text-xs font-medium text-muted-foreground">
              Urgency
            </label>
            <select
              id="urgency"
              name="urgency"
              defaultValue={urgency ?? ""}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">All urgency</option>
              {URGENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label htmlFor="sort" className="mb-1 block text-xs font-medium text-muted-foreground">
              Sort by
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={sort}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="most_urgent">Most urgent</option>
              <option value="newest">Newest</option>
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

      <AlertsTable alerts={alerts} tab={tab} />
    </main>
  );
}
