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
import { US_STATES } from "@/lib/constants/us-states";

const ENTITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "LLC", label: "LLC" },
  { value: "S_CORP", label: "S-Corp" },
  { value: "C_CORP", label: "C-Corp" },
  { value: "SOLE_PROPRIETOR", label: "Sole Proprietor" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "TRUST", label: "Trust" },
  { value: "OTHER", label: "Other" },
  { value: "NON_PROFIT", label: "Non-Profit" },
];

type AddEntityDrawerProps = {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (entity: { id: string; name: string }) => void;
};

export function AddEntityDrawer({
  clientId,
  open,
  onOpenChange,
  onSuccess,
}: AddEntityDrawerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [stateOfFormation, setStateOfFormation] = useState("");
  const [ein, setEin] = useState("");
  const [formationDate, setFormationDate] = useState("");

  function resetForm() {
    setName("");
    setEntityType("");
    setStateOfFormation("");
    setEin("");
    setFormationDate("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Legal entity name is required.");
      return;
    }
    if (!entityType) {
      setError("Entity type is required.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          name: trimmedName,
          entityType,
          stateOfFormation: stateOfFormation.trim() || null,
          ein: ein.trim() || null,
          formationDate: formationDate.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string; id?: string } & { name?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      handleOpenChange(false);
      router.refresh();
      toast.success("Entity added");
      if (data.id != null && data.name != null) {
        onSuccess?.({ id: data.id, name: data.name });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="sm:max-w-md border-[#1E2D4A] bg-[#0D1526]">
        <SheetHeader>
          <SheetTitle className="text-slate-100">Add entity</SheetTitle>
          <SheetDescription className="text-slate-400">
            Add a legal entity to this client. You can add revenue data from the entity list to start tracking nexus.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="add-entity-name" className="text-slate-400">
              Legal Entity Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="add-entity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme LLC"
              className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              disabled={pending}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-entity-type" className="text-slate-400">
              Entity Type <span className="text-red-400">*</span>
            </Label>
            <select
              id="add-entity-type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
              disabled={pending}
            >
              <option value="">Select type</option>
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-entity-state" className="text-slate-400">
              State of Formation
            </Label>
            <select
              id="add-entity-state"
              value={stateOfFormation}
              onChange={(e) => setStateOfFormation(e.target.value)}
              className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
              disabled={pending}
            >
              <option value="">Select state</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-entity-ein" className="text-slate-400">
              EIN
            </Label>
            <Input
              id="add-entity-ein"
              value={ein}
              onChange={(e) => setEin(e.target.value)}
              placeholder="XX-XXXXXXX"
              className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              disabled={pending}
            />
            <p className="text-xs text-slate-500">
              Stored encrypted. Never shared or logged.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-entity-formation-date" className="text-slate-400">
              Formation Date
            </Label>
            <Input
              id="add-entity-formation-date"
              type="date"
              value={formationDate}
              onChange={(e) => setFormationDate(e.target.value)}
              className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
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
              {pending ? "Adding…" : "Add entity"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
