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
          className="rounded-md border px-2.5 py-1 text-xs font-medium"
        >
          Reassign
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Reassign Work</DialogTitle>
          <DialogDescription>
            Move assigned work from <span className="font-medium">{fromUserLabel}</span> to another staff member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="fromUser" className="text-xs font-medium text-muted-foreground">
              From
            </label>
            <input
              id="fromUser"
              disabled
              value={fromUserLabel}
              className="w-full rounded-md border bg-muted/40 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="toUser" className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <select
              id="toUser"
              value={toUserId}
              onChange={(event) => setToUserId(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select staff member</option>
              {targetOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.email})
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeFilings}
              onChange={(event) => setIncludeFilings(event.target.checked)}
            />
            Reassign filings too (open filings)
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {isPending ? "Reassigning..." : "Confirm Reassign"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
