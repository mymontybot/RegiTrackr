"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  markFlagNoChange,
  markFlagDismissed,
  updateThresholdAndFlag,
  triggerMonitorState,
} from "@/app/(admin)/threshold-flags/actions";

type StateThresholdRow = {
  id: string;
  stateCode: string;
  stateName: string;
  salesThreshold: unknown;
  transactionThreshold: number | null;
  measurementPeriod: string;
  effectiveDate: Date;
  sourceUrl: string;
  source_url: string | null;
  lastVerifiedDate: Date | null;
  nextReviewDue: Date | null;
  dataConfidenceLevel: string | null;
  notes?: string | null;
};

type FlagRow = {
  id: string;
  stateCode: string;
  stateThresholdId: string;
  flagType: string;
  detectedValue: string | null;
  currentValue: string | null;
  detectedAt: Date;
  rawSnippet: string | null;
  stateThreshold: StateThresholdRow;
};

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function num(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "string") return Number(v).toLocaleString();
  return String(v);
}

const MEASUREMENT_OPTIONS = [
  { value: "CALENDAR_YEAR", label: "Calendar year" },
  { value: "ROLLING_12_MONTHS", label: "Rolling 12 months" },
  { value: "PRIOR_YEAR", label: "Prior year" },
] as const;

type Props = {
  pendingFlags: FlagRow[];
  allStates: StateThresholdRow[];
  pendingCount: number;
  reviewedThisWeekCount: number;
  statesWithNoSourceUrlCount: number;
  nextScheduledRun: string;
};

export function ThresholdFlagsClient({
  pendingFlags,
  allStates,
  pendingCount,
  reviewedThisWeekCount,
  statesWithNoSourceUrlCount,
  nextScheduledRun,
}: Props) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FlagRow | null>(null);
  const [dismissFlagId, setDismissFlagId] = useState<string | null>(null);
  const [dismissNote, setDismissNote] = useState("");
  const [pending, setPending] = useState(false);

  const [formSales, setFormSales] = useState("");
  const [formTransactions, setFormTransactions] = useState("");
  const [formMeasurement, setFormMeasurement] = useState("CALENDAR_YEAR");
  const [formEffectiveDate, setFormEffectiveDate] = useState("");
  const [formSourceUrl, setFormSourceUrl] = useState("");
  const [formSourceUrlOfficial, setFormSourceUrlOfficial] = useState("");
  const [formNotes, setFormNotes] = useState("");

  function openDrawer(flag: FlagRow) {
    const t = flag.stateThreshold;
    setEditingFlag(flag);
    setFormSales(String(t.salesThreshold ?? ""));
    setFormTransactions(t.transactionThreshold != null ? String(t.transactionThreshold) : "");
    setFormMeasurement(t.measurementPeriod ?? "CALENDAR_YEAR");
    setFormEffectiveDate(
      t.effectiveDate
        ? (typeof t.effectiveDate === "string"
            ? new Date(t.effectiveDate)
            : t.effectiveDate
          ).toISOString().slice(0, 10)
        : ""
    );
    setFormSourceUrl(t.sourceUrl ?? "");
    setFormSourceUrlOfficial(t.source_url ?? "");
    setFormNotes(t.notes ?? "");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingFlag(null);
  }

  async function handleNoChange(flagId: string) {
    setPending(true);
    try {
      const { error } = await markFlagNoChange(flagId);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Flag marked as no change.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function openDismiss(flagId: string) {
    setDismissFlagId(flagId);
    setDismissNote("");
  }

  function closeDismiss() {
    setDismissFlagId(null);
    setDismissNote("");
  }

  async function handleDismiss() {
    if (!dismissFlagId) return;
    const trimmed = dismissNote.trim();
    if (!trimmed) {
      toast.error("A note is required when dismissing.");
      return;
    }
    setPending(true);
    try {
      const { error } = await markFlagDismissed(dismissFlagId, trimmed);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Flag dismissed.");
      closeDismiss();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleUpdateThreshold() {
    if (!editingFlag) return;
    const sales = Number(formSales);
    if (Number.isNaN(sales) || sales < 0) {
      toast.error("Enter a valid sales threshold.");
      return;
    }
    const transactions =
      formTransactions.trim() === "" ? null : Number(formTransactions);
    if (formTransactions.trim() !== "" && (Number.isNaN(Number(formTransactions)) || Number(formTransactions) < 0)) {
      toast.error("Enter a valid transaction threshold or leave blank.");
      return;
    }
    if (!formSourceUrl.trim()) {
      toast.error("Source URL is required.");
      return;
    }
    setPending(true);
    try {
      const { error } = await updateThresholdAndFlag(
        editingFlag.id,
        editingFlag.stateThresholdId,
        {
          salesThreshold: sales,
          transactionThreshold: transactions,
          measurementPeriod: formMeasurement,
          effectiveDate: formEffectiveDate || new Date().toISOString().slice(0, 10),
          sourceUrl: formSourceUrl.trim(),
          source_url: formSourceUrlOfficial.trim() || null,
          notes: formNotes.trim() || null,
        }
      );
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Threshold updated and narratives invalidated.");
      closeDrawer();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyNow(
    stateCode: string,
    stateThresholdId: string,
    sourceUrl: string
  ) {
    setPending(true);
    try {
      const { error } = await triggerMonitorState(
        stateCode,
        stateThresholdId,
        sourceUrl
      );
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`Verify now triggered for ${stateCode}.`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
        >
          <div
            className={`font-mono text-2xl font-bold ${pendingCount > 0 ? "text-amber-400" : "text-slate-100"}`}
          >
            {pendingCount}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-500">
            Pending flags
          </div>
        </div>
        <div
          className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
        >
          <div className="font-mono text-2xl font-bold text-slate-100">
            {reviewedThisWeekCount}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-500">
            Reviewed this week
          </div>
        </div>
        <div
          className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
        >
          <div
            className={`font-mono text-2xl font-bold ${statesWithNoSourceUrlCount > 0 ? "text-red-400" : "text-slate-100"}`}
          >
            {statesWithNoSourceUrlCount}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-500">
            States with no source URL
          </div>
        </div>
        <div
          className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
        >
          <div className="font-mono text-sm font-bold text-slate-100">
            {nextScheduledRun}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-500">
            Next scheduled run
          </div>
        </div>
      </div>

      {/* Pending flags table */}
      <div className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
        <h2 className="border-b border-[#1A2640] pb-4 text-base font-semibold text-slate-100">
          Pending flags
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#1A2640]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  State
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Flag type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Detected value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Current value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Detected at
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Snippet
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingFlags.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No pending flags.
                  </td>
                </tr>
              ) : (
                pendingFlags.map((flag) => (
                  <tr
                    key={flag.id}
                    className="border-b border-[#1A2640] bg-[#0A1020] transition-colors hover:bg-[#111D35] even:bg-[#0A1020]"
                  >
                    <td className="px-4 py-2.5 font-mono text-sm text-slate-300">
                      {flag.stateCode}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">
                      {flag.flagType}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm text-slate-300">
                      {flag.detectedValue ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm text-slate-300">
                      {flag.currentValue ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                      {formatDate(flag.detectedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-400">
                      —
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-sm text-slate-400">
                      {flag.rawSnippet ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => openDrawer(flag)}
                          disabled={pending}
                        >
                          Update threshold
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:bg-[#111D35] hover:text-slate-200"
                          onClick={() => handleNoChange(flag.id)}
                          disabled={pending}
                        >
                          No change
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:bg-[#111D35] hover:text-red-300"
                          onClick={() => openDismiss(flag.id)}
                          disabled={pending}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All states table */}
      <div className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
        <h2 className="border-b border-[#1A2640] pb-4 text-base font-semibold text-slate-100">
          All states
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#1A2640]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  State
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Sales threshold
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Transaction threshold
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Last verified
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Next review due
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                  Source URL
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {allStates.map((row) => {
                const nextDue =
                  row.nextReviewDue == null
                    ? null
                    : typeof row.nextReviewDue === "string"
                      ? new Date(row.nextReviewDue)
                      : row.nextReviewDue;
                const isOverdue =
                  nextDue != null && nextDue.getTime() < Date.now();
                const hasNoUrl = row.source_url == null || row.source_url === "";
                const sourceUrl =
                  (row.source_url ?? row.sourceUrl) || "";
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-[#1A2640] transition-colors hover:bg-[#111D35] even:bg-[#0A1020] ${isOverdue ? "bg-amber-950/30" : ""}`}
                  >
                    <td className="px-4 py-2.5 font-mono text-sm text-slate-300">
                      {row.stateCode}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm text-slate-300">
                      {num(row.salesThreshold)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm text-slate-300">
                      {row.transactionThreshold != null
                        ? row.transactionThreshold.toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">
                      {row.dataConfidenceLevel ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                      {formatDate(row.lastVerifiedDate)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                      {formatDate(row.nextReviewDue)}
                    </td>
                    <td className="px-4 py-2.5">
                      {hasNoUrl ? (
                        <span className="rounded-full border border-red-800 bg-red-900/50 px-2.5 py-0.5 text-xs font-medium font-mono text-red-300">
                          Missing URL
                        </span>
                      ) : (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="max-w-[120px] truncate text-xs text-blue-400 hover:underline"
                        >
                          {sourceUrl.slice(0, 30)}…
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#2A3F66] text-slate-300 hover:bg-[#111D35] hover:text-slate-100"
                        onClick={() =>
                          handleVerifyNow(row.stateCode, row.id, sourceUrl || row.sourceUrl)
                        }
                        disabled={pending || !sourceUrl}
                      >
                        Verify now
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update threshold drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="max-w-md border-l border-[#1E2D4A] bg-[#0D1526] sm:max-w-lg"
        >
          <SheetHeader className="border-b border-[#1A2640] pb-4">
            <SheetTitle className="text-base font-semibold text-slate-100">
              Update threshold
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-6">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-400">
                Sales threshold
              </Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={formSales}
                onChange={(e) => setFormSales(e.target.value)}
                className="rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-400">
                Transaction threshold (optional)
              </Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={formTransactions}
                onChange={(e) => setFormTransactions(e.target.value)}
                className="rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-400">
                Measurement period
              </Label>
              <select
                value={formMeasurement}
                onChange={(e) => setFormMeasurement(e.target.value)}
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {MEASUREMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-400">
                Effective date
              </Label>
              <Input
                type="date"
                value={formEffectiveDate}
                onChange={(e) => setFormEffectiveDate(e.target.value)}
                className="rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-400">
                Source URL
              </Label>
              <Input
                type="url"
                value={formSourceUrl}
                onChange={(e) => setFormSourceUrl(e.target.value)}
                placeholder="https://..."
                className="rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-400">
                Official source_url (optional)
              </Label>
              <Input
                type="url"
                value={formSourceUrlOfficial}
                onChange={(e) => setFormSourceUrlOfficial(e.target.value)}
                placeholder="https://..."
                className="rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-400">
                Notes
              </Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                className="rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <SheetFooter className="border-t border-[#1A2640] pt-4">
            <Button
              variant="ghost"
              className="text-slate-400 hover:bg-[#111D35] hover:text-slate-200"
              onClick={closeDrawer}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handleUpdateThreshold}
              disabled={pending}
            >
              Save & mark updated
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Dismiss note modal / inline */}
      {dismissFlagId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-100">
              Dismiss flag
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              A note is required when dismissing.
            </p>
            <Textarea
              value={dismissNote}
              onChange={(e) => setDismissNote(e.target.value)}
              placeholder="Reason for dismissal..."
              rows={3}
              className="mt-4 w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                className="text-slate-400 hover:bg-[#111D35] hover:text-slate-200"
                onClick={closeDismiss}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-900/50 text-red-300 hover:bg-red-900 hover:text-red-100 border border-red-800"
                onClick={handleDismiss}
                disabled={pending || !dismissNote.trim()}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
