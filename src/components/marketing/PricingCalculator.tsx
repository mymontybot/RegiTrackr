"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { calculatePrice, PRICING } from "@/lib/config/pricing";
import type { TierId } from "@/lib/config/pricing";

const PRESETS = [5, 15, 30, 75, 150] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const TIER_BADGE_CLASS: Record<TierId, string> = {
  starter: "rounded-full border px-2.5 py-0.5 text-xs font-medium font-mono bg-[#0A1628] text-[#60A5FA] border-[#1E40AF]",
  growth: "rounded-full border px-2.5 py-0.5 text-xs font-medium font-mono bg-[#1A1400] text-[#FDE047] border-[#854D0E]",
  pro: "rounded-full border px-2.5 py-0.5 text-xs font-medium font-mono bg-[#052E16] text-[#4ADE80] border-[#166534]",
  enterprise: "rounded-full border px-2.5 py-0.5 text-xs font-medium font-mono bg-[#1E1B4B] text-[#A78BFA] border-[#5B21B6]",
};

export function PricingCalculator() {
  const [clients, setClients] = useState(15);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(15);
  const [customInput, setCustomInput] = useState("");
  const [isFoundingMember, setIsFoundingMember] = useState(false);

  const result = useMemo(
    () => calculatePrice(Math.max(1, Math.min(500, clients)), isFoundingMember),
    [clients, isFoundingMember],
  );
  const tierId = result.tier.id as TierId;

  const handlePresetClick = (value: number) => {
    setClients(value);
    setSelectedPreset(value);
    setCustomInput("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCustomInput(raw);
    setSelectedPreset(null);
    const num = parseInt(raw, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= 500) {
      setClients(num);
    } else if (raw === "") {
      setClients(15);
    }
  };

  return (
    <section className="bg-[#060B18] py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-3">
          <span className="h-px w-10 bg-blue-500/40" />
          <span className="text-xs font-medium uppercase tracking-widest text-blue-400">Pricing</span>
          <span className="h-px w-10 bg-blue-500/40" />
        </div>
        <h2 className="mt-4 [font-family:var(--font-syne),system-ui,sans-serif] text-3xl font-bold text-slate-100 lg:text-4xl">
          Simple per-client pricing. No surprises.
        </h2>
        <p className="mt-3 text-base text-slate-400">
          Monthly minimum $199. Price per client drops as you add more.
        </p>

        <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-[#1E2D4A] bg-[#0D1526] p-8" style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}>
          <label className="mb-3 block text-xs font-medium text-slate-400">
            How many clients does your firm manage?
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePresetClick(value)}
                className={`rounded-lg px-4 py-2 text-sm font-mono transition-colors cursor-pointer ${
                  selectedPreset === value
                    ? "border border-blue-500 bg-blue-500/10 text-blue-300"
                    : "border border-[#1E2D4A] bg-[#111D35] text-slate-300 hover:border-[#2A3F66] hover:text-slate-100"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            max={500}
            value={customInput}
            onChange={handleCustomChange}
            placeholder="Or type any number (1-500)"
            className="mt-3 w-full rounded-lg border border-[#1E2D4A] bg-[#060B18] px-4 py-2 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="founding"
              checked={isFoundingMember}
              onChange={(e) => setIsFoundingMember(e.target.checked)}
              className="accent-amber-500"
            />
            <label htmlFor="founding" className="cursor-pointer text-xs text-slate-400">
              Founding member pricing (first 25 firms, locked for life)
            </label>
          </div>

          <div className="my-6 border-t border-[#1A2640]" />

          <div>
            <span className={TIER_BADGE_CLASS[tierId]}>
              {result.tier.name}
            </span>
            <p className={`mt-2 font-mono text-4xl font-bold transition-all duration-150 ${isFoundingMember ? "text-[#FDE047]" : "text-slate-100"}`}>
              About {formatCurrency(result.monthly)}/month
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {result.clients} clients at {formatCurrency(result.pricePerClient)}/client
              {isFoundingMember ? <span className="text-[#FDE047]"> (founding member rate)</span> : null}
            </p>
            {result.floorApplied ? (
              <p className="mt-1 text-xs text-slate-500">(monthly minimum $199 applies)</p>
            ) : null}

            {result.isEnterprise ? (
              <div className="mt-4 rounded-lg border border-[#5B21B6] bg-[#1E1B4B] p-3 text-xs text-slate-400">
                Enterprise pricing includes a $500 platform fee plus $25/client/month. Contact us to discuss custom
                onboarding and integrations.
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          All plans include nexus monitoring, filing calendar, and AI narratives. No long-term contract.
          <Link href="/pricing" className="ml-1 text-blue-400 hover:text-blue-300">
            See full pricing details
          </Link>
        </p>
      </div>
    </section>
  );
}

export default PricingCalculator;
