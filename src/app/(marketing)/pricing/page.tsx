"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PricingCalculator } from "@/components/marketing/PricingCalculator";
import { PRICING } from "@/lib/config/pricing";

const FAQ_ITEMS = [
  {
    question: "How is the client count calculated?",
    answer:
      "Client count is the number of active client entities in your RegiTrackr account at billing time. You can add and remove clients at any time. Billing adjusts automatically at the start of each monthly cycle.",
  },
  {
    question: "What happens if my client count crosses a tier boundary?",
    answer:
      "Your pricing tier updates automatically at the next billing cycle. If you add a client that moves you from Starter to Growth, your rate drops from $59 to $45 per client on the next invoice. You are never penalized for growing.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "We offer a 14-day free trial with full access to all features. No credit card required to start. After the trial, you choose a plan or cancel with no charge.",
  },
  {
    question: "What does the AI Nexus Exposure Narrative actually do?",
    answer:
      "It reads every data point in a client's dashboard including threshold percentages, filing deadlines, registration status, and alert history, and produces a plain-English paragraph summarizing their complete compliance position. It is informational only and does not constitute tax advice. See our AI Disclaimer for details.",
  },
  {
    question: "Can I cancel at any time?",
    answer:
      "Yes. No long-term contract, no cancellation fee. Cancel from your account settings and billing stops at the end of the current period. Your data is retained for 90 days after cancellation.",
  },
  {
    question: "Is our client data secure?",
    answer:
      "Yes. All data is encrypted in transit and at rest. We do not share or sell client data. Client financial data is never used to train AI models. See our Security page for full details.",
  },
  {
    question: "What is Enterprise pricing?",
    answer:
      "Enterprise is for firms with more than 100 clients. Pricing is $25/client/month plus a $500 platform fee. For firms with complex needs, dedicated onboarding, or custom integrations, contact us to discuss.",
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatClientRange(minClients: number, maxClients: number): string {
  return maxClients === Infinity ? `${minClients}+ clients` : `${minClients}-${maxClients} clients`;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-3">
      <span className="h-px w-10 bg-blue-500/40" />
      <span className="text-xs font-medium uppercase tracking-widest text-blue-400">{children}</span>
      <span className="h-px w-10 bg-blue-500/40" />
    </div>
  );
}

export default function PricingPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#060B18]/90 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="[font-family:var(--font-syne),system-ui,sans-serif] text-xl font-bold tracking-[-0.02em] text-slate-100"
          >
            RegiTrackr
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm text-slate-300 transition-colors hover:text-slate-100">
              Sign in
            </Link>
            <a
              href="/#waitlist"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Join waitlist
            </a>
          </div>
        </nav>
      </header>

      <main className="bg-[#060B18] pt-16">
        <section className="py-24 text-center">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <Eyebrow>Pricing</Eyebrow>
            <h1 className="mt-6 whitespace-pre-line [font-family:var(--font-syne),system-ui,sans-serif] text-4xl font-bold tracking-[-0.02em] text-slate-100 lg:text-5xl">
              {"Simple per-client pricing.\nNo surprises."}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
              Pay for exactly the clients you manage. Price per client drops as your firm grows. Monthly minimum
              $199. No long-term contract required.
            </p>

            <div className="mx-auto mt-16 max-w-xl">
              <PricingCalculator />
            </div>

            <div className="mx-auto mt-24 max-w-4xl">
              <Eyebrow>All Plans Include</Eyebrow>
              <p className="mx-auto mt-2 mb-12 max-w-3xl text-sm text-slate-400">
                Nexus threshold monitoring, filing deadline calendar, AI Nexus Exposure Narrative, multi-entity
                management, client portal, and PDF risk scorecard export. No feature tiers. Every paying customer
                gets everything.
              </p>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {PRICING.tiers.map((tier) => (
                  <article
                    key={tier.id}
                    className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 text-left"
                    style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
                  >
                    <p className="font-mono text-xs uppercase tracking-widest text-blue-400">
                      {tier.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatClientRange(tier.minClients, tier.maxClients)}
                    </p>
                    <p className="mt-4 font-mono text-3xl font-bold text-slate-100">
                      {formatCurrency(tier.pricePerClient)}
                      <span className="ml-1 text-sm font-normal text-slate-500">/client/mo</span>
                    </p>
                    <p className="mt-2 text-sm text-[#FDE047]">
                      Founding rate: {formatCurrency(tier.foundingPricePerClient)}/client
                    </p>
                    {tier.id === "enterprise" ? (
                      <p className="mt-3 text-xs text-slate-500">Contact us for Enterprise pricing</p>
                    ) : null}
                    {"platformFee" in tier ? (
                      <p className="mt-1 text-xs text-slate-500">
                        + {formatCurrency(tier.platformFee)} platform fee
                      </p>
                    ) : null}
                    <p className="mt-4 text-xs text-slate-600">Min. {formatCurrency(PRICING.floor)}/mo</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mx-auto mt-16 max-w-2xl rounded-xl border border-[#854D0E] bg-[#1A1400] p-8 text-left">
              <span className="inline-flex rounded-full border border-[#854D0E] bg-[#1A1400] px-3 py-1 font-mono text-xs font-medium text-[#FDE047]">
                Founding Member
              </span>
              <h2 className="mt-4 text-xl font-bold text-slate-100">
                Lock in founding member rates. Forever.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                The first 25 CPA firms to subscribe to RegiTrackr receive founding member pricing locked for life.
                Rates are 25-35% below standard pricing and never increase as long as your subscription stays active.
                When founding spots are gone, they are gone.
              </p>
              <a
                href="/#waitlist"
                className="mt-6 inline-flex rounded-lg bg-amber-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-600"
              >
                Join the waitlist
              </a>
            </div>

            <div className="mx-auto mt-24 max-w-2xl text-left">
              <Eyebrow>Common Questions</Eyebrow>
              <h2 className="mt-4 [font-family:var(--font-syne),system-ui,sans-serif] text-2xl font-bold text-slate-100">
                Everything you need to know.
              </h2>

              <div className="mt-8 rounded-xl border border-[#1E2D4A] bg-[#0D1526]">
                {FAQ_ITEMS.map((item, index) => {
                  const isOpen = openIndex === index;
                  return (
                    <div key={item.question} className="border-b border-[#1E2D4A] last:border-0">
                      <button
                        type="button"
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                        className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[#111D35]"
                      >
                        <span className="text-sm font-medium text-slate-100">{item.question}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isOpen ? (
                        <p className="px-6 pb-5 text-sm leading-relaxed text-slate-400">{item.answer}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mt-16 text-center text-xs text-slate-600">
              All prices in USD. Founding member pricing requires an active subscription and is non-transferable.
              RegiTrackr is a compliance monitoring tool and does not provide tax advice.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1E2D4A] bg-[#060B18] py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 RegiTrackr</p>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="transition-colors hover:text-slate-300">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/terms" className="transition-colors hover:text-slate-300">
              Terms
            </Link>
            <span>·</span>
            <Link href="/security" className="transition-colors hover:text-slate-300">
              Security
            </Link>
            <span>·</span>
            <Link href="/sign-in" className="transition-colors hover:text-slate-300">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
