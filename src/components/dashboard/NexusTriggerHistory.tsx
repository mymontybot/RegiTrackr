"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, CircleHelp, Loader2 } from "lucide-react";
import type { NexusTriggerHistory as NexusTriggerHistoryRow } from "@/lib/engines/nexus-history.engine";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type NexusTriggerHistoryProps = {
  entityId: string;
};

function formatMonthYear(value: { year: number; month: number } | null): string {
  if (!value) return "—";
  return new Date(Date.UTC(value.year, value.month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function HeaderWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1 text-slate-500">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-slate-500 hover:text-slate-400">
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6} className="max-w-[260px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function NexusTriggerHistory({ entityId }: NexusTriggerHistoryProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<NexusTriggerHistoryRow[] | null>(null);

  const sortedRows = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => a.stateCode.localeCompare(b.stateCode));
  }, [rows]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || rows !== null || isLoading) return;

    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/entities/${entityId}/nexus-history`, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error("Failed to load nexus trigger history");
      }
      const payload = (await response.json()) as { data: NexusTriggerHistoryRow[] };
      setRows(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load history");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between text-left text-slate-100"
      >
        <h2 className="text-sm font-semibold">Nexus Trigger History</h2>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>

      {open ? (
        <div className="mt-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading trigger history...
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {!isLoading && !error ? (
            <Table className="w-full border-collapse text-sm">
              <TableHeader>
                <TableRow className="border-b border-[#1A2640]">
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">State</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                    <HeaderWithTooltip
                      label="First Warning"
                      tooltip="First month where cumulative threshold reached at least 70%."
                    />
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                    <HeaderWithTooltip
                      label="First Urgent"
                      tooltip="First month where cumulative threshold reached at least 90%."
                    />
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                    <HeaderWithTooltip
                      label="First Triggered"
                      tooltip="First month where cumulative threshold reached at least 100%."
                    />
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.length === 0 ? (
                  <TableRow className="border-b border-[#1A2640]">
                    <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                      No trigger history available.
                    </TableCell>
                  </TableRow>
                ) : null}
                {sortedRows.map((row, index) => (
                  <TableRow
                    key={row.stateCode}
                    className={`border-b border-[#1A2640] transition-colors hover:bg-[#111D35] ${index % 2 === 1 ? "bg-[#0A1020]" : ""}`}
                  >
                    <TableCell className="px-4 py-2.5 font-mono font-medium text-slate-100">{row.stateCode}</TableCell>
                    <TableCell className="px-4 py-2.5 font-mono text-xs text-slate-400">{formatMonthYear(row.firstWarningDate)}</TableCell>
                    <TableCell className="px-4 py-2.5 font-mono text-xs text-slate-400">{formatMonthYear(row.firstUrgentDate)}</TableCell>
                    <TableCell className="px-4 py-2.5 font-mono text-xs text-slate-400">{formatMonthYear(row.firstTriggeredDate)}</TableCell>
                    <TableCell className="px-4 py-2.5">
                      {row.dataQualityNote ? (
                        <p className="text-xs text-[#FDE047]">{row.dataQualityNote}</p>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
