"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type ClientEditFormProps = {
  clientId: string;
  initialName: string;
  initialIndustry: string | null;
};

export function ClientEditForm({
  clientId,
  initialName,
  initialIndustry,
}: ClientEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [industry, setIndustry] = useState(initialIndustry ?? "");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          industry,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Failed to update client");
        return;
      }

      router.push(`/dashboard/clients/${clientId}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
      <div className="space-y-1.5">
        <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-slate-400">
          Client name
        </label>
        <input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="industry" className="mb-1.5 block text-xs font-medium text-slate-400">
          Industry
        </label>
        <input
          id="industry"
          value={industry}
          onChange={(event) => setIndustry(event.target.value)}
          className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder="Optional"
        />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          className="rounded-lg border border-[#2A3F66] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
