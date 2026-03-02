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
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-5">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Client name
        </label>
        <input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="industry" className="text-sm font-medium">
          Industry
        </label>
        <input
          id="industry"
          value={industry}
          onChange={(event) => setIndustry(event.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Optional"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
