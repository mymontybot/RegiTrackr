"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CLIENT_COUNT_OPTIONS = [
  "1 to 10 clients",
  "11 to 25 clients",
  "26 to 50 clients",
  "51 to 100 clients",
  "100+ clients",
] as const;

type OnboardingFormProps = {
  initialOwnerName: string;
};

export function OnboardingForm({ initialOwnerName }: OnboardingFormProps) {
  const router = useRouter();
  const [firmName, setFirmName] = useState("");
  const [ownerName, setOwnerName] = useState(initialOwnerName);
  const [clientCount, setClientCount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmedFirm = firmName.trim();
    const trimmedOwner = ownerName.trim();
    if (!trimmedFirm || !trimmedOwner || !clientCount) {
      setError("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/firm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedFirm,
          ownerName: trimmedOwner,
          clientCount,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <p className="mb-2 text-xs text-slate-500">Step 1 of 1</p>
      <h1 className="text-2xl font-bold text-slate-100">Set up your firm</h1>
      <p className="mt-2 mb-8 text-sm text-slate-400">
        This takes 30 seconds. You can change everything later.
      </p>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="firmName"
            className="mb-1.5 block text-xs font-medium text-slate-400"
          >
            Firm name <span className="text-red-400">*</span>
          </label>
          <input
            id="firmName"
            type="text"
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            placeholder="e.g. Hartwell & Associates CPA"
            required
            className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="ownerName"
            className="mb-1.5 block text-xs font-medium text-slate-400"
          >
            Your name <span className="text-red-400">*</span>
          </label>
          <input
            id="ownerName"
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="e.g. Sarah Chen"
            required
            className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="clientCount"
            className="mb-1.5 block text-xs font-medium text-slate-400"
          >
            How many clients do you manage? <span className="text-red-400">*</span>
          </label>
          <select
            id="clientCount"
            value={clientCount}
            onChange={(e) => setClientCount(e.target.value)}
            required
            className="w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-4 py-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select range</option>
            {CLIENT_COUNT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Setting up...
          </>
        ) : (
          "Go to my dashboard →"
        )}
      </button>
    </form>
  );
}
