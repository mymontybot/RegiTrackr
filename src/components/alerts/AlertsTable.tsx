"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AlertCenterItem, AlertCenterTab } from "@/lib/services/nexus.service";
import { NexusBadge } from "@/components/ui/NexusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AlertsTableProps = {
  alerts: AlertCenterItem[];
  tab: AlertCenterTab;
};

function formatDateTime(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function AlertsTable({ alerts, tab }: AlertsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [days, setDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allSelected = useMemo(
    () => alerts.length > 0 && selectedIds.length === alerts.length,
    [alerts.length, selectedIds.length],
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    setSelectedIds((prev) => (prev.length === alerts.length ? [] : alerts.map((a) => a.id)));
  };

  const bulkSnooze = () => {
    if (selectedIds.length === 0) {
      setError("Select at least one alert.");
      return;
    }
    if (!note.trim()) {
      setError("A bulk snooze note is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/alerts/bulk-snooze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertIds: selectedIds,
          note,
          days,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Failed to snooze alerts");
        return;
      }

      setSelectedIds([]);
      setNote("");
      router.refresh();
    });
  };

  const runRowAction = (alertId: string, action: "snooze" | "unsnooze" | "read") => {
    setError(null);

    startTransition(async () => {
      setActionPendingId(alertId);
      try {
        let response: Response;
        if (action === "snooze") {
          const snoozeNote =
            window.prompt("Snooze note (required):", "Snoozed from Alerts Center") ??
            "";
          if (!snoozeNote.trim()) {
            setError("Snooze cancelled: note is required.");
            return;
          }
          response = await fetch(`/api/alerts/${alertId}/snooze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: snoozeNote, days: 30 }),
          });
        } else if (action === "unsnooze") {
          response = await fetch(`/api/alerts/${alertId}/unsnooze`, { method: "POST" });
        } else {
          response = await fetch(`/api/alerts/${alertId}/read`, { method: "POST" });
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          setError(payload.error ?? "Alert action failed");
          return;
        }

        router.refresh();
      } finally {
        setActionPendingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {tab === "active" ? (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1">
              <label htmlFor="bulk-note" className="mb-1 block text-xs font-medium text-muted-foreground">
                Bulk snooze note
              </label>
              <input
                id="bulk-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Required note for selected alerts"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="w-36">
              <label htmlFor="bulk-days" className="mb-1 block text-xs font-medium text-muted-foreground">
                Snooze days
              </label>
              <select
                id="bulk-days"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value={7}>7</option>
                <option value={14}>14</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
              </select>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={bulkSnooze}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {isPending ? "Snoozing..." : `Bulk snooze (${selectedIds.length})`}
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {tab === "active" ? (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all alerts"
                  />
                </TableHead>
              ) : null}
              <TableHead>Client</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Alert Type</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Created</TableHead>
              {tab === "snoozed" ? <TableHead>Snoozed Until</TableHead> : null}
              <TableHead>Email History</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tab === "active" ? 10 : 9} className="py-8 text-center text-muted-foreground">
                  No alerts found for current filters.
                </TableCell>
              </TableRow>
            ) : null}
            {alerts.map((alert) => (
              <TableRow key={alert.id}>
                {tab === "active" ? (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(alert.id)}
                      onChange={() => toggleSelection(alert.id)}
                      aria-label={`Select alert ${alert.id}`}
                    />
                  </TableCell>
                ) : null}
                <TableCell className="font-medium">{alert.clientName}</TableCell>
                <TableCell>{alert.entityName}</TableCell>
                <TableCell>{alert.stateCode}</TableCell>
                <TableCell>{alert.alertType}</TableCell>
                <TableCell>
                  <NexusBadge band={alert.band} />
                </TableCell>
                <TableCell>{formatDateTime(new Date(alert.createdAt))}</TableCell>
                {tab === "snoozed" ? (
                  <TableCell>{formatDateTime(alert.snoozedUntil ? new Date(alert.snoozedUntil) : null)}</TableCell>
                ) : null}
                <TableCell>{formatDateTime(alert.lastEmailSentAt ? new Date(alert.lastEmailSentAt) : null)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {tab === "active" ? (
                      <button
                        type="button"
                        disabled={isPending && actionPendingId === alert.id}
                        onClick={() => runRowAction(alert.id, "snooze")}
                        className="rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-60"
                      >
                        Snooze
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending && actionPendingId === alert.id}
                        onClick={() => runRowAction(alert.id, "unsnooze")}
                        className="rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-60"
                      >
                        Unsnooze
                      </button>
                    )}
                    {!alert.isRead ? (
                      <button
                        type="button"
                        disabled={isPending && actionPendingId === alert.id}
                        onClick={() => runRowAction(alert.id, "read")}
                        className="rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-60"
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
