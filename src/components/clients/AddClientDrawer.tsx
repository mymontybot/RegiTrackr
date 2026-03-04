"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const INDUSTRY_OPTIONS = [
  "E-commerce",
  "SaaS",
  "Professional Services",
  "Real Estate",
  "Manufacturing",
  "Healthcare",
  "Other",
] as const;

type StaffOption = {
  id: string;
  name: string | null;
  email: string;
};

type AddClientDrawerProps = {
  staffOptions: StaffOption[];
};

export function AddClientDrawer({ staffOptions }: AddClientDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<string>("");
  const [assignedUserId, setAssignedUserId] = useState<string>("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setName("");
    setIndustry("");
    setAssignedUserId("");
    setNotes("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Client name is required.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          industry: industry.trim() || null,
          assignedUserId: assignedUserId.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      handleOpenChange(false);
      router.refresh();
      toast.success("Client added successfully");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
      >
        Add Client
      </Button>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-md border-[#1E2D4A] bg-[#0D1526]">
          <SheetHeader>
            <SheetTitle className="text-slate-100">Add client</SheetTitle>
            <SheetDescription className="text-slate-400">
              Create a new client for your firm. You can add entities and revenue data from the client detail page.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="add-client-name" className="text-slate-400">
                Client Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="add-client-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                disabled={pending}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-client-industry" className="text-slate-400">
                Industry
              </Label>
              <select
                id="add-client-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
                disabled={pending}
              >
                <option value="">Select industry</option>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-client-assigned" className="text-slate-400">
                Assigned Staff
              </Label>
              <select
                id="add-client-assigned"
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
                disabled={pending}
              >
                <option value="">Unassigned</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name ?? staff.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-client-notes" className="text-slate-400">
                Notes
              </Label>
              <Textarea
                id="add-client-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this client"
                rows={3}
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none disabled:opacity-50"
                disabled={pending}
              />
            </div>
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <SheetFooter className="flex-row justify-end gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={pending}
                className="border-[#2A3F66] text-slate-300 hover:bg-[#111D35] hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {pending ? "Adding…" : "Add client"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
