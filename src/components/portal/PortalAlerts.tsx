import type { PortalAlertRow } from "@/lib/services/portal.service";
import { NexusBadge } from "@/components/ui/NexusBadge";

type PortalAlertsProps = {
  rows: PortalAlertRow[];
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function PortalAlerts({ rows }: PortalAlertsProps) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">Active Alerts</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Threshold alerts only. Snooze controls are only available to your CPA firm.
      </p>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active threshold alerts.</p>
        ) : null}
        {rows.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">
                {row.stateCode} · {row.alertType}
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</p>
            </div>
            <NexusBadge band={row.band} />
          </div>
        ))}
      </div>
    </section>
  );
}
