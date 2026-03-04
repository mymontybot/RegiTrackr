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
  UPCOMING: "bg-slate-800 text-slate-300 border border-slate-700",
  PREPARED: "bg-[#0A1628] text-[#60A5FA] border border-[#1E40AF]",
  OVERDUE: "bg-[#1C0505] text-[#F87171] border border-[#991B1B] font-semibold",
  FILED: "bg-[#052E16] text-[#4ADE80] border border-[#166534]",
  CONFIRMED: "bg-[#052E16] text-[#4ADE80] border border-[#166534] font-semibold",
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
  return `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS_MAP[status]}`;
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
      <div className="flex items-center justify-between rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
        <p className="text-sm text-slate-500">
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
          className="rounded-lg border border-[#2A3F66] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
        >
          Weekly digest email preview
        </button>
      </div>

      {showDigest ? (
        <div className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
          <h3 className="text-base font-semibold text-slate-100">Monday digest preview</h3>
          <div className="mt-2 space-y-1">
            {weeklyDigestLines.map((line) => (
              <p key={line} className="text-sm text-slate-300">
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {view === "month" ? (
        <div className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-7 border-b border-[#1A2640] bg-[#111D35]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="border-r border-[#1A2640] px-2 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 last:border-r-0">
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
                  className={`min-h-28 border-r border-b border-[#1A2640] p-2 last:border-r-0 ${inMonth ? "bg-[#0D1526]" : "bg-[#0A1020]"}`}
                >
                  <p className="mb-1 text-xs font-medium font-mono text-slate-400">{day.getDate()}</p>
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
                        className={`block w-full truncate rounded border px-2 py-0.5 text-left text-[11px] ${STATUS_CLASS_MAP[filing.status]}`}
                        title={`${filing.clientName} • ${filing.entityName} • ${filing.stateCode}`}
                      >
                        {filing.entityName} · {filing.stateCode}
                      </button>
                    ))}
                    {dayFilings.length > 4 ? (
                      <p className="text-[11px] text-slate-500">+{dayFilings.length - 4} more</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-[1.2fr_1.2fr_.7fr_.8fr_.8fr_.7fr_1fr] gap-2 border-b border-[#1A2640] bg-[#111D35] px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-widest text-slate-500">Client</div>
            <div className="text-xs font-medium uppercase tracking-widest text-slate-500">Entity</div>
            <div className="text-xs font-medium uppercase tracking-widest text-slate-500">State</div>
            <div className="text-xs font-medium uppercase tracking-widest text-slate-500">Filing Period</div>
            <div className="text-xs font-medium uppercase tracking-widest text-slate-500">Due Date</div>
            <div className="text-xs font-medium uppercase tracking-widest text-slate-500">Status</div>
            <div className="text-xs font-medium uppercase tracking-widest text-slate-500">Assigned To</div>
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
                    className={`absolute left-0 grid w-full grid-cols-[1.2fr_1.2fr_.7fr_.8fr_.8fr_.7fr_1fr] items-center gap-2 border-b border-[#1A2640] px-4 py-2.5 text-left text-sm text-slate-300 transition-colors hover:bg-[#111D35] ${virtualRow.index % 2 === 1 ? "bg-[#0A1020]" : ""}`}
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      height: `${virtualRow.size}px`,
                    }}
                  >
                    <span className="truncate pr-2 font-medium text-slate-100">{filing.clientName}</span>
                    <span className="truncate pr-2">{filing.entityName}</span>
                    <span className="font-mono">{filing.stateCode}</span>
                    <span className="font-mono">{formatPeriod(filing)}</span>
                    <span className="font-mono text-xs text-slate-400">{formatDate(new Date(filing.dueDate))}</span>
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
        <SheetContent side="right" className="sm:max-w-md bg-[#0D1526] border-l border-[#1E2D4A]">
          {selected ? (
            <>
              <SheetHeader className="border-b border-[#1A2640] pb-4 mb-6">
                <SheetTitle className="text-base font-semibold text-slate-100">Status Update</SheetTitle>
                <SheetDescription className="text-sm text-slate-400">
                  {selected.clientName} · {selected.entityName} · {selected.stateCode}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-5">
                <div className="text-sm text-slate-300">
                  <p>
                    <span className="font-medium text-slate-100">Due:</span> <span className="font-mono">{formatDate(new Date(selected.dueDate))}</span>
                  </p>
                  <p>
                    <span className="font-medium text-slate-100">Current:</span>{" "}
                    <span className={statusClass(selected.status)}>{selected.status}</span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="nextStatus" className="mb-1.5 block text-xs font-medium text-slate-400">
                    Next status
                  </label>
                  <select
                    id="nextStatus"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value as FilingStatus | "")}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    <option value="">Select status</option>
                    {NEXT_STATUS_MAP[selected.status].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="note" className="mb-1.5 block text-xs font-medium text-slate-400">
                    Transition note
                  </label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="min-h-24 w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="Required note for audit history"
                  />
                </div>
                {error ? <p className="text-sm text-red-400">{error}</p> : null}
                <button
                  type="button"
                  disabled={isPending || !nextStatus}
                  onClick={submitStatus}
                  className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
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
