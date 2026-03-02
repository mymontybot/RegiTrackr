import type { PortalDeadlineRow } from "@/lib/services/portal.service";

type PortalDeadlinesProps = {
  rows: PortalDeadlineRow[];
};

const STATUS_CLASS: Record<PortalDeadlineRow["status"], string> = {
  UPCOMING: "bg-blue-100 text-blue-800",
  PREPARED: "bg-purple-100 text-purple-800",
  OVERDUE: "bg-red-100 text-red-800",
  FILED: "bg-green-100 text-green-800",
  CONFIRMED: "bg-gray-100 text-gray-800",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function PortalDeadlines({ rows }: PortalDeadlinesProps) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">Upcoming Deadlines</h2>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
        ) : null}
        {rows.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {row.stateCode} · {row.periodLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                Due {formatDate(row.dueDate)} ({row.daysUntilDue >= 0 ? `in ${row.daysUntilDue}d` : `${Math.abs(row.daysUntilDue)}d overdue`})
              </p>
            </div>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[row.status]}`}>
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
