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
        <div className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1">
              <label htmlFor="bulk-note" className="mb-1.5 block text-xs font-medium text-slate-400">
                Bulk snooze note
              </label>
              <input
                id="bulk-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Required note for selected alerts"
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div className="w-36">
              <label htmlFor="bulk-days" className="mb-1.5 block text-xs font-medium text-slate-400">
                Snooze days
              </label>
              <select
                id="bulk-days"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
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
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
            >
              {isPending ? "Snoozing..." : `Bulk snooze (${selectedIds.length})`}
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#1E2D4A] bg-[#0D1526] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
        <Table className="w-full border-collapse text-sm">
          <TableHeader>
            <TableRow className="border-b border-[#1A2640] hover:bg-transparent">
              {tab === "active" ? (
                <TableHead className="w-10 px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all alerts"
                  />
                </TableHead>
              ) : null}
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Client</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Entity</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">State</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Alert Type</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Urgency</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Created</TableHead>
              {tab === "snoozed" ? <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Snoozed Until</TableHead> : null}
              <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Email History</TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest text-slate-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.length === 0 ? (
              <TableRow className="border-b border-[#1A2640] hover:bg-transparent">
                <TableCell colSpan={tab === "active" ? 10 : 9} className="py-16 text-center text-slate-500">
                  No alerts found for current filters.
                </TableCell>
              </TableRow>
            ) : null}
            {alerts.map((alert, index) => (
              <TableRow
                key={alert.id}
                className={`border-b border-[#1A2640] transition-colors hover:bg-[#111D35] ${index % 2 === 1 ? "bg-[#0A1020]" : ""}`}
              >
                {tab === "active" ? (
                  <TableCell className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(alert.id)}
                      onChange={() => toggleSelection(alert.id)}
                      aria-label={`Select alert ${alert.id}`}
                    />
                  </TableCell>
                ) : null}
                <TableCell className="px-4 py-2.5 font-medium text-slate-100">{alert.clientName}</TableCell>
                <TableCell className="px-4 py-2.5 text-slate-300">{alert.entityName}</TableCell>
                <TableCell className="px-4 py-2.5 font-mono text-slate-300">{alert.stateCode}</TableCell>
                <TableCell className="px-4 py-2.5 text-slate-300">{alert.alertType}</TableCell>
                <TableCell className="px-4 py-2.5">
                  <NexusBadge band={alert.band} />
                </TableCell>
                <TableCell className="px-4 py-2.5 font-mono text-xs text-slate-400">{formatDateTime(new Date(alert.createdAt))}</TableCell>
                {tab === "snoozed" ? (
                  <TableCell className="px-4 py-2.5 font-mono text-xs text-slate-400">{formatDateTime(alert.snoozedUntil ? new Date(alert.snoozedUntil) : null)}</TableCell>
                ) : null}
                <TableCell className="px-4 py-2.5 font-mono text-xs text-slate-400">{formatDateTime(alert.lastEmailSentAt ? new Date(alert.lastEmailSentAt) : null)}</TableCell>
                <TableCell className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-2">
                    {tab === "active" ? (
                      <button
                        type="button"
                        disabled={isPending && actionPendingId === alert.id}
                        onClick={() => runRowAction(alert.id, "snooze")}
                        className="rounded-lg border border-[#2A3F66] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100 disabled:opacity-60"
                      >
                        Snooze
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending && actionPendingId === alert.id}
                        onClick={() => runRowAction(alert.id, "unsnooze")}
                        className="rounded-lg border border-[#2A3F66] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100 disabled:opacity-60"
                      >
                        Unsnooze
                      </button>
                    )}
                    {!alert.isRead ? (
                      <button
                        type="button"
                        disabled={isPending && actionPendingId === alert.id}
                        onClick={() => runRowAction(alert.id, "read")}
                        className="rounded-lg border border-[#2A3F66] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100 disabled:opacity-60"
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
