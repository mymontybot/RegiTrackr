"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

type WaitlistFormProps = {
  id: string;
};

type WaitlistResponse = {
  success?: boolean;
  error?: string;
};

export function WaitlistForm({ id }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json().catch(() => ({}))) as WaitlistResponse;

      if (!response.ok) {
        setError(payload.error ?? "Unable to join waitlist right now.");
        return;
      }

      setIsSuccess(true);
      setEmail("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-[#1A2640] bg-[#0D1526] px-4 py-3 text-sm text-green-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>You're on the list. We'll be in touch soon.</span>
      </div>
    );
  }

  return (
    <form id={id} onSubmit={handleSubmit} className="mx-auto w-full max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your firm email"
          required
          className="w-full flex-1 rounded-lg border border-[#1E2D4A] bg-[#0D1526] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="whitespace-nowrap rounded-lg bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Get early access"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-left text-sm text-red-400">{error}</p>
      ) : null}
    </form>
  );
}
