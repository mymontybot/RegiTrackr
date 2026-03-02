"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type RevenueSubmitFormProps = {
  stateOptions: string[];
};

export function RevenueSubmitForm({ stateOptions }: RevenueSubmitFormProps) {
  const router = useRouter();
  const [stateCode, setStateCode] = useState(stateOptions[0] ?? "");
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [revenueAmount, setRevenueAmount] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/portal/revenue-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateCode,
          periodYear,
          periodMonth,
          revenueAmount: Number(revenueAmount),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Failed to submit revenue");
        return;
      }

      setMessage("Revenue submitted successfully. Your CPA firm has been notified.");
      setRevenueAmount("");
      router.refresh();
    });
  };

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">Revenue Submission</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Submit monthly revenue for your client account.
      </p>
      <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="stateCode" className="mb-1 block text-xs font-medium text-muted-foreground">
            State
          </label>
          <select
            id="stateCode"
            value={stateCode}
            onChange={(event) => setStateCode(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          >
            {stateOptions.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="periodYear" className="mb-1 block text-xs font-medium text-muted-foreground">
            Period year
          </label>
          <input
            id="periodYear"
            type="number"
            min={2000}
            max={2100}
            value={periodYear}
            onChange={(event) => setPeriodYear(Number(event.target.value))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="periodMonth" className="mb-1 block text-xs font-medium text-muted-foreground">
            Period month
          </label>
          <input
            id="periodMonth"
            type="number"
            min={1}
            max={12}
            value={periodMonth}
            onChange={(event) => setPeriodMonth(Number(event.target.value))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="revenueAmount" className="mb-1 block text-xs font-medium text-muted-foreground">
            Revenue amount
          </label>
          <input
            id="revenueAmount"
            type="number"
            min={0}
            step="0.01"
            value={revenueAmount}
            onChange={(event) => setRevenueAmount(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="md:col-span-4">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {isPending ? "Submitting..." : "Submit revenue"}
          </button>
        </div>
      </form>
      {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
