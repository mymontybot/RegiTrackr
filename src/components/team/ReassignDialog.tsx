"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type StaffOption = {
  id: string;
  name: string;
  email: string;
};

type ReassignDialogProps = {
  fromUserId: string;
  fromUserLabel: string;
  staffOptions: StaffOption[];
};

export function ReassignDialog({
  fromUserId,
  fromUserLabel,
  staffOptions,
}: ReassignDialogProps) {
  const [open, setOpen] = useState(false);
  const [toUserId, setToUserId] = useState("");
  const [includeFilings, setIncludeFilings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const targetOptions = useMemo(
    () => staffOptions.filter((staff) => staff.id !== fromUserId),
    [staffOptions, fromUserId],
  );

  const onConfirm = () => {
    setError(null);
    if (!toUserId) {
      setError("Select a staff member to reassign to.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/team/reassign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId,
          toUserId,
          includeFilings,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Failed to reassign");
        return;
      }

      setOpen(false);
      window.location.reload();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setToUserId("");
          setIncludeFilings(true);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-lg border border-[#2A3F66] px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
        >
          Reassign
        </button>
      </DialogTrigger>
      <DialogContent className="border-[#1E2D4A] bg-[#0D1526]">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Bulk Reassign Work</DialogTitle>
          <DialogDescription className="text-slate-400">
            Move assigned work from <span className="font-medium text-slate-200">{fromUserLabel}</span> to another staff member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="fromUser" className="text-xs font-medium text-slate-400">
              From
            </label>
            <input
              id="fromUser"
              disabled
              value={fromUserLabel}
              className="w-full rounded-lg border border-[#1E2D4A] bg-[#111D35] px-3 py-2 text-sm text-slate-400"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="toUser" className="text-xs font-medium text-slate-400">
              To
            </label>
            <select
              id="toUser"
              value={toUserId}
              onChange={(event) => setToUserId(event.target.value)}
              className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="">Select staff member</option>
              {targetOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.email})
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={includeFilings}
              onChange={(event) => setIncludeFilings(event.target.checked)}
              className="rounded border-[#1E2D4A] bg-[#060B18] text-blue-500 focus:ring-blue-500"
            />
            Reassign filings too (open filings)
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>

        <DialogFooter>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
          >
            {isPending ? "Reassigning..." : "Confirm Reassign"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
