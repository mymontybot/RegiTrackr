"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { FilingStatus } from "@prisma/client";
import type { CalendarFilingItem } from "@/lib/services/deadline.service";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type CalendarView = "month" | "list";

type FilingCalendarClientProps = {
  view: CalendarView;
  month: string;
  lookahead: 30 | 60 | 90;
  filings: CalendarFilingItem[];
  weeklyDigestLines: string[];
};

const STATUS_CLASS_MAP: Record<FilingStatus, string> = {
  UPCOMING: "bg-blue-100 text-blue-800",
  PREPARED: "bg-purple-100 text-purple-800",
  OVERDUE: "bg-red-100 text-red-800",
  FILED: "bg-green-100 text-green-800",
  CONFIRMED: "bg-gray-100 text-gray-800",
};

const STATUS_OPTIONS: FilingStatus[] = ["UPCOMING", "PREPARED", "FILED", "CONFIRMED", "OVERDUE"];

const NEXT_STATUS_MAP: Record<FilingStatus, FilingStatus[]> = {
  UPCOMING: ["PREPARED", "OVERDUE"],
  PREPARED: ["FILED", "CONFIRMED", "OVERDUE"],
  FILED: ["CONFIRMED"],
  CONFIRMED: [],
  OVERDUE: ["FILED"],
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatPeriod(item: CalendarFilingItem) {
  if (item.periodQuarter) return `${item.periodYear} Q${item.periodQuarter}`;
  if (item.periodMonth) return `${item.periodYear}-${String(item.periodMonth).padStart(2, "0")}`;
  return String(item.periodYear);
}

function startOfMonth(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1);
}

function getMonthGrid(monthKey: string): Date[] {
  const monthStart = startOfMonth(monthKey);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return date;
  });
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function statusClass(status: FilingStatus): string {
  return `inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS_MAP[status]}`;
}

export function FilingCalendarClient({
  view,
  month,
  lookahead,
  filings,
  weeklyDigestLines,
}: FilingCalendarClientProps) {
  const router = useRouter();
  const [showDigest, setShowDigest] = useState(false);
  const [selected, setSelected] = useState<CalendarFilingItem | null>(null);
  const [nextStatus, setNextStatus] = useState<FilingStatus | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement | null>(null);

  const monthDateMap = useMemo(() => {
    const map = new Map<string, CalendarFilingItem[]>();
    for (const filing of filings) {
      const key = toDateKey(new Date(filing.dueDate));
      map.set(key, [...(map.get(key) ?? []), filing]);
    }
    return map;
  }, [filings]);

  const days = useMemo(() => getMonthGrid(month), [month]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filings.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 52,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const monthStart = startOfMonth(month);

  const submitStatus = () => {
    if (!selected || !nextStatus) return;
    if (!note.trim()) {
      setError("A transition note is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/filings/${selected.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          note,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Unable to update filing status");
        return;
      }

      setSelected(null);
      setNextStatus("");
      setNote("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {view === "month"
            ? `Month view for ${monthStart.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}`
            : `List view (${lookahead}-day lookahead)`}
        </p>
        <button
          type="button"
          onClick={() => setShowDigest((v) => !v)}
          className="rounded-md border px-3 py-1.5 text-sm font-medium"
        >
          Weekly digest email preview
        </button>
      </div>

      {showDigest ? (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium">Monday digest preview</h3>
          <div className="mt-2 space-y-1">
            {weeklyDigestLines.map((line) => (
              <p key={line} className="text-sm text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {view === "month" ? (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-7 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="border-r px-2 py-2 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = toDateKey(day);
              const dayFilings = monthDateMap.get(key) ?? [];
              const inMonth = day.getMonth() === monthStart.getMonth();
              return (
                <div
                  key={key}
                  className={`min-h-28 border-r border-b p-2 last:border-r-0 ${inMonth ? "" : "bg-muted/20"}`}
                >
                  <p className="mb-1 text-xs font-medium">{day.getDate()}</p>
                  <div className="space-y-1">
                    {dayFilings.slice(0, 4).map((filing) => (
                      <button
                        key={filing.id}
                        type="button"
                        onClick={() => {
                          setSelected(filing);
                          setNextStatus("");
                          setNote("");
                          setError(null);
                        }}
                        className={`block w-full truncate rounded px-2 py-0.5 text-left text-[11px] ${STATUS_CLASS_MAP[filing.status]}`}
                        title={`${filing.clientName} • ${filing.entityName} • ${filing.stateCode}`}
                      >
                        {filing.entityName} · {filing.stateCode}
                      </button>
                    ))}
                    {dayFilings.length > 4 ? (
                      <p className="text-[11px] text-muted-foreground">+{dayFilings.length - 4} more</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-[1.2fr_1.2fr_.7fr_.8fr_.8fr_.7fr_1fr] gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
            <div>Client</div>
            <div>Entity</div>
            <div>State</div>
            <div>Filing Period</div>
            <div>Due Date</div>
            <div>Status</div>
            <div>Assigned To</div>
          </div>
          <div ref={listRef} className="h-[560px] overflow-auto">
            <div
              style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
              className="w-full"
            >
              {virtualRows.map((virtualRow) => {
                const filing = filings[virtualRow.index];
                if (!filing) return null;
                return (
                  <button
                    key={filing.id}
                    type="button"
                    onClick={() => {
                      setSelected(filing);
                      setNextStatus("");
                      setNote("");
                      setError(null);
                    }}
                    className="absolute left-0 grid w-full grid-cols-[1.2fr_1.2fr_.7fr_.8fr_.8fr_.7fr_1fr] gap-2 border-b px-3 text-left text-sm hover:bg-muted/40"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      height: `${virtualRow.size}px`,
                    }}
                  >
                    <span className="truncate pr-2">{filing.clientName}</span>
                    <span className="truncate pr-2">{filing.entityName}</span>
                    <span>{filing.stateCode}</span>
                    <span>{formatPeriod(filing)}</span>
                    <span>{formatDate(new Date(filing.dueDate))}</span>
                    <span>
                      <span className={statusClass(filing.status)}>{filing.status}</span>
                    </span>
                    <span className="truncate">
                      {filing.assignedTo ? filing.assignedTo.name ?? filing.assignedTo.email : "Unassigned"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setNextStatus("");
            setNote("");
            setError(null);
          }
        }}
      >
        <SheetContent side="right" className="sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>Status Update</SheetTitle>
                <SheetDescription>
                  {selected.clientName} · {selected.entityName} · {selected.stateCode}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-5">
                <div className="text-sm">
                  <p>
                    <span className="font-medium">Due:</span> {formatDate(new Date(selected.dueDate))}
                  </p>
                  <p>
                    <span className="font-medium">Current:</span>{" "}
                    <span className={statusClass(selected.status)}>{selected.status}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="nextStatus" className="text-sm font-medium">
                    Next status
                  </label>
                  <select
                    id="nextStatus"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value as FilingStatus | "")}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select status</option>
                    {NEXT_STATUS_MAP[selected.status].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="note" className="text-sm font-medium">
                    Transition note
                  </label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Required note for audit history"
                  />
                </div>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <button
                  type="button"
                  disabled={isPending || !nextStatus}
                  onClick={submitStatus}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {isPending ? "Saving..." : "Update status"}
                </button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export { STATUS_OPTIONS };
