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
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-muted-foreground">
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
    <section className="rounded-lg border bg-card p-4">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-sm font-semibold">Nexus Trigger History</h2>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="mt-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading trigger history...
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!isLoading && !error ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>
                    <HeaderWithTooltip
                      label="First Warning"
                      tooltip="First month where cumulative threshold reached at least 70%."
                    />
                  </TableHead>
                  <TableHead>
                    <HeaderWithTooltip
                      label="First Urgent"
                      tooltip="First month where cumulative threshold reached at least 90%."
                    />
                  </TableHead>
                  <TableHead>
                    <HeaderWithTooltip
                      label="First Triggered"
                      tooltip="First month where cumulative threshold reached at least 100%."
                    />
                  </TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No trigger history available.
                    </TableCell>
                  </TableRow>
                ) : null}
                {sortedRows.map((row) => (
                  <TableRow key={row.stateCode}>
                    <TableCell className="font-medium">{row.stateCode}</TableCell>
                    <TableCell>{formatMonthYear(row.firstWarningDate)}</TableCell>
                    <TableCell>{formatMonthYear(row.firstUrgentDate)}</TableCell>
                    <TableCell>{formatMonthYear(row.firstTriggeredDate)}</TableCell>
                    <TableCell>
                      {row.dataQualityNote ? (
                        <p className="text-xs text-amber-700">{row.dataQualityNote}</p>
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
