import { Activity, Calendar, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

const comparisonRows = [
  { feature: "Nexus threshold monitoring", regitrackr: "✓", avalara: "Partial", taxjar: "Partial", spreadsheets: "Manual" },
  { feature: "CPA multi-client dashboard", regitrackr: "✓", avalara: "-", taxjar: "-", spreadsheets: "Manual" },
  { feature: "Filing deadline calendar", regitrackr: "✓", avalara: "-", taxjar: "-", spreadsheets: "Manual" },
  { feature: "Multi-entity management", regitrackr: "✓", avalara: "Ent.", taxjar: "Limited", spreadsheets: "Manual" },
  { feature: "AI compliance narrative", regitrackr: "✓", avalara: "-", taxjar: "-", spreadsheets: "-" },
  { feature: "Client portal", regitrackr: "✓", avalara: "-", taxjar: "-", spreadsheets: "-" },
  { feature: "Tax calculation & filing", regitrackr: "-", avalara: "✓", taxjar: "✓", spreadsheets: "-" },
  { feature: "SMB-accessible pricing", regitrackr: "✓", avalara: "Partial", taxjar: "✓", spreadsheets: "✓" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-3">
      <span className="h-px w-10 bg-blue-500/40" />
      <span className="text-xs font-medium uppercase tracking-widest text-blue-400">{children}</span>
      <span className="h-px w-10 bg-blue-500/40" />
    </div>
  );
}

function renderCellValue(value: string) {
  if (value === "✓") {
    return <span className="font-medium text-[#4ADE80]">✓</span>;
  }
  if (value === "-") {
    return <span className="text-slate-600">-</span>;
  }
  if (value === "Manual") {
    return <span className="text-slate-400">Manual</span>;
  }
  return <span className="text-slate-300">{value}</span>;
}

export default function MarketingPage() {
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
              href="#waitlist"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Join waitlist
            </a>
          </div>
        </nav>
      </header>

      <main className="pt-16">
        <section className="relative overflow-hidden bg-[#060B18] py-32 sm:py-36">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,235,0.15), transparent), radial-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)",
              backgroundSize: "100% 100%, 20px 20px",
            }}
          />
          <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
            <Eyebrow>For CPA Firms Managing Multi-State Clients</Eyebrow>
            <h1 className="mt-8 whitespace-pre-line [font-family:var(--font-syne),system-ui,sans-serif] text-5xl font-bold tracking-[-0.03em] text-slate-100 lg:text-7xl">
              {"Stop tracking nexus\nin spreadsheets."}
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-slate-400">
              RegiTrackr gives CPA firms a single compliance dashboard: real-time nexus threshold monitoring, filing
              deadline calendars, and an AI-powered briefing on every client's exposure. Before the liability event,
              not after.
            </p>

            <div className="mt-10 w-full">
              <WaitlistForm id="waitlist" />
              <p className="mt-6 text-xs text-slate-500">Join 200+ CPA firms on the waitlist</p>
            </div>
          </div>
        </section>

        <section className="border-y border-[#1E2D4A] bg-[#0D1526] py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <Eyebrow>The Problem</Eyebrow>
            <h2 className="mt-6 whitespace-pre-line [font-family:var(--font-syne),system-ui,sans-serif] text-3xl font-bold tracking-[-0.02em] text-slate-100 lg:text-4xl">
              {"The 2018 Wayfair ruling created\na compliance crisis no tool solved."}
            </h2>

            <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
              <div className="space-y-6">
                <p className="text-base leading-relaxed text-slate-300">
                  Before Wayfair, a business needed a physical presence in a state to owe sales tax there. The ruling
                  changed everything: now any business exceeding $100,000 in sales to a state must register, collect,
                  and remit, regardless of where they operate.
                </p>
                <p className="text-base leading-relaxed text-slate-300">
                  CPA firms managing 20 to 100 business clients are tracking this exposure across hundreds of
                  state-entity combinations. In spreadsheets. With calendar reminders. And manual lookups on state
                  revenue department websites.
                </p>
                <p className="text-base font-medium leading-relaxed text-blue-400">
                  One missed registration is a six-figure audit. One missed filing is a damaged client relationship.
                  The tools that exist (Avalara, TaxJar) solve the problem after nexus is triggered. Nobody built
                  the monitoring layer. Until now.
                </p>
              </div>

              <div className="space-y-4">
                <div
                  className="rounded-xl border border-[#1E2D4A] bg-[#060B18] p-6"
                  style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
                >
                  <div className="font-mono text-4xl font-bold text-slate-100">50</div>
                  <p className="mt-2 text-sm text-slate-400">states now have economic nexus laws</p>
                </div>
                <div
                  className="rounded-xl border border-[#1E2D4A] bg-[#060B18] p-6"
                  style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
                >
                  <div className="font-mono text-4xl font-bold text-[#F87171]">$100K</div>
                  <p className="mt-2 text-sm text-slate-400">minimum threshold before registration required</p>
                  <p className="mt-1 text-xs text-slate-600">in most states</p>
                </div>
                <div
                  className="rounded-xl border border-[#1E2D4A] bg-[#060B18] p-6"
                  style={{ borderTop: "1px solid rgba(59,130,246,0.4)" }}
                >
                  <div className="font-mono text-4xl font-bold text-slate-100">3 to 5 min</div>
                  <p className="mt-2 text-sm text-slate-400">
                    a CPA spends synthesizing one client's compliance position
                  </p>
                  <p className="mt-1 text-xs text-blue-400">RegiTrackr does it in 8 seconds</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#060B18] py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <Eyebrow>What RegiTrackr Does</Eyebrow>
            <h2 className="mt-6 whitespace-pre-line [font-family:var(--font-syne),system-ui,sans-serif] text-3xl font-bold tracking-[-0.02em] text-slate-100 lg:text-4xl">
              {"Everything between the spreadsheet\nand the audit."}
            </h2>

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
              <article className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 transition-colors hover:border-[#2A3F66]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-slate-100">Real-Time Nexus Threshold Monitoring</h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  Track every client entity's revenue exposure across all 50 states. Color-coded status bands (Safe,
                  Warning, Urgent, Triggered) update automatically as revenue data is entered. Never miss an
                  approaching threshold again.
                </p>
              </article>

              <article className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 transition-colors hover:border-[#2A3F66]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-slate-100">Filing Deadline Calendar</h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  Every sales tax filing deadline for every client in one unified calendar. Holiday-adjusted due
                  dates, configurable reminders, and a status workflow from Upcoming to Confirmed, with a full audit
                  trail.
                </p>
              </article>

              <article className="rounded-xl border border-[rgba(124,58,237,0.3)] bg-[#0D1526] p-6 transition-colors hover:border-violet-600">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-slate-100">AI Nexus Exposure Narrative</h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  Open any client dashboard and read a plain-English paragraph synthesizing their complete compliance
                  position in 8 seconds. Threshold proximity, upcoming deadlines, registration gaps. All synthesized.
                  Included for every plan.
                </p>
              </article>

              <article className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6 transition-colors hover:border-[#2A3F66]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-slate-100">Multi-Entity Client Management</h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  Manage unlimited clients, each with multiple legal entities, under one firm account. Role-based
                  staff access, workload visibility, and a white-labeled client portal so your clients can see their
                  own status without calling you.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="border-y border-[#1E2D4A] bg-[#0D1526] py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <Eyebrow>How We Compare</Eyebrow>
            <h2 className="mt-6 [font-family:var(--font-syne),system-ui,sans-serif] text-3xl font-bold tracking-[-0.02em] text-slate-100">
              Built for the gap the big tools left open.
            </h2>

            <div className="mt-12 overflow-x-auto rounded-xl border border-[#1E2D4A]">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#1A2640] bg-[#060B18]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-slate-500">
                      Feature
                    </th>
                    <th className="bg-[rgba(59,130,246,0.04)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-blue-400">
                      RegiTrackr
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-widest text-slate-500">
                      Avalara
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-widest text-slate-500">
                      TaxJar
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-widest text-slate-500">
                      Spreadsheets
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, index) => (
                    <tr key={row.feature} className={`border-b border-[#1A2640] ${index % 2 === 1 ? "bg-[#0A1020]" : ""}`}>
                      <td className="px-4 py-3 font-medium text-slate-300">{row.feature}</td>
                      <td className="bg-[rgba(59,130,246,0.04)] px-4 py-3 text-center">
                        {renderCellValue(row.regitrackr)}
                      </td>
                      <td className="px-4 py-3 text-center">{renderCellValue(row.avalara)}</td>
                      <td className="px-4 py-3 text-center">{renderCellValue(row.taxjar)}</td>
                      <td className="px-4 py-3 text-center">{renderCellValue(row.spreadsheets)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#060B18] py-24 text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,235,0.15), transparent)",
            }}
          />
          <div className="relative mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="whitespace-pre-line [font-family:var(--font-syne),system-ui,sans-serif] text-4xl font-bold tracking-[-0.02em] text-slate-100 lg:text-5xl">
              {"Your clients' compliance exposure\nis visible. Or it isn't."}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
              RegiTrackr is in private beta. Join the waitlist and be among the first CPA firms to replace their
              spreadsheets.
            </p>
            <div className="mt-10">
              <WaitlistForm id="waitlist-bottom" />
            </div>
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
