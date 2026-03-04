import { Eye, Lock, Shield, Users } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Security | RegiTrackr",
  description: "How RegiTrackr protects your firm and client data.",
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-3">
      <span className="h-px w-10 bg-blue-500/40" />
      <span className="text-xs font-medium uppercase tracking-widest text-blue-400">{children}</span>
      <span className="h-px w-10 bg-blue-500/40" />
    </div>
  );
}

const ACCESS_ROWS = [
  { role: "Firm Admin", clients: "All clients", billing: "Full access", staff: "Full access", settings: "Full access" },
  { role: "Manager", clients: "Assigned clients", billing: "View only", staff: "No access", settings: "No access" },
  { role: "Staff", clients: "Assigned clients (read)", billing: "No access", staff: "No access", settings: "No access" },
  { role: "Client Portal User", clients: "Their own data", billing: "No access", staff: "No access", settings: "No access" },
];

function AccessCell({ value }: { value: string }) {
  if (value === "Full access") return <span className="text-[#4ADE80]">{value}</span>;
  if (value === "View only") return <span className="text-[#FDE047]">{value}</span>;
  if (value === "No access") return <span className="text-slate-600">{value}</span>;
  if (value.includes("(read)")) return <span className="text-[#60A5FA]">{value}</span>;
  return <span className="text-slate-300">{value}</span>;
}

const PROVIDERS = [
  { name: "Supabase", description: "Database & Storage", badge: "SOC 2 Type II" },
  { name: "Clerk", description: "Authentication", badge: "SOC 2 Type II" },
  { name: "Stripe", description: "Payments", badge: "PCI DSS Level 1" },
  { name: "Vercel", description: "Hosting & Edge Network", badge: "SOC 2 Type II" },
];

export default function SecurityPage() {
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

      <main className="pt-16">
        <section className="bg-[#060B18] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Eyebrow>Security</Eyebrow>
            <h1 className="mt-4 whitespace-pre-line [font-family:var(--font-syne),system-ui,sans-serif] text-4xl font-bold text-slate-100 lg:text-5xl">
              {"Your clients' data is protected.\nWe take that seriously."}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-400">
              RegiTrackr stores sensitive client financial data. Here is exactly what we do to protect it, who can
              access it, and what your firm controls.
            </p>

            <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-2">
              <article className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Lock className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-base font-semibold text-slate-100">Encryption at Rest and in Transit</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  All data stored in RegiTrackr is encrypted at rest using AES-256. All data transmitted between your
                  browser and our servers uses TLS 1.2 or higher. Client financial data, revenue figures, and
                  registration records are never stored in plain text.
                </p>
              </article>
              <article className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Shield className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-base font-semibold text-slate-100">Strict Multi-Tenant Isolation</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  Your firm's data is completely isolated from every other firm on the platform. Row-level security
                  enforced at the database layer means no query from one firm's account can ever read, write, or affect
                  another firm's data. This is verified in our test suite on every deployment.
                </p>
              </article>
              <article className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-base font-semibold text-slate-100">Role-Based Access Control</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  Every user in your firm has a role: Firm Admin, Manager, or Staff. Admins control who can see what.
                  Managers can view and edit assigned clients. Staff have read access to assigned clients. No user can
                  access data outside their assigned scope.
                </p>
              </article>
              <article className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Eye className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-base font-semibold text-slate-100">You Control Your Data</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  Your firm owns your data. You can export all client records at any time. You can request complete
                  deletion of your firm's data at any time. We do not sell, share, or license your data to any third
                  party for any purpose.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="mt-24 border-y border-[#1E2D4A] bg-[#0D1526] py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <Eyebrow>Infrastructure</Eyebrow>
            <h2 className="mt-4 [font-family:var(--font-syne),system-ui,sans-serif] text-3xl font-bold text-slate-100">
              Built on infrastructure you can trust.
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
              <div className="space-y-4 text-sm leading-relaxed text-slate-400">
                <p>
                  RegiTrackr is built on a stack of well-established, security-focused infrastructure providers.
                </p>
                <p>
                  Our database runs on Supabase, which provides PostgreSQL hosting with automatic encryption, daily
                  backups, and point-in-time recovery. Authentication is handled by Clerk, which provides
                  enterprise-grade user authentication with MFA support, session management, and SOC 2 Type II
                  certification.
                </p>
                <p>
                  Payments are processed exclusively by Stripe. RegiTrackr never stores credit card numbers or payment
                  credentials of any kind. All billing data lives in Stripe's PCI-compliant infrastructure.
                </p>
                <p>
                  Our application runs on Vercel's edge network, which provides automatic HTTPS, DDoS mitigation, and
                  global distribution.
                </p>
              </div>
              <div className="space-y-4">
                {PROVIDERS.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-4 rounded-lg border border-[#1E2D4A] bg-[#060B18] p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-100">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.description}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full border border-[#166534] bg-[#052E16] px-2 py-0.5 font-mono text-xs text-[#4ADE80]">
                      {p.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#060B18] py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Eyebrow>AI and Your Data</Eyebrow>
            <h2 className="mt-4 [font-family:var(--font-syne),system-ui,sans-serif] text-3xl font-bold text-slate-100">
              Your client data is never used to train AI models.
            </h2>
            <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-slate-400">
              <p>
                RegiTrackr uses Anthropic's Claude API to generate the AI Nexus Exposure Narrative feature. When a
                narrative is generated, the relevant client data is sent to the Anthropic API as a structured prompt
                and the response is returned immediately.
              </p>
              <p>
                We use Anthropic's API under terms that explicitly prohibit the use of API inputs and outputs to train
                Anthropic's models. Your client data does not leave your account permanently, is not stored by Anthropic,
                and is not used to improve any AI model.
              </p>
              <p>
                The AI Narrative feature can be disabled at the firm level by a Firm Admin in account settings if your
                firm has a policy against using AI-assisted tools.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-[#1E2D4A] bg-[#0D1526] py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Eyebrow>Access Controls</Eyebrow>
            <h2 className="mt-4 [font-family:var(--font-syne),system-ui,sans-serif] text-3xl font-bold text-slate-100">
              Who can see what. You decide.
            </h2>
            <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-xl border border-[#1E2D4A]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#1A2640] bg-[#060B18]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Clients
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Billing
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Staff Management
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Settings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ACCESS_ROWS.map((row, i) => (
                    <tr
                      key={row.role}
                      className={`border-b border-[#1A2640] ${i % 2 === 1 ? "bg-[#0A1020]" : "bg-[#060B18]"}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-300">{row.role}</td>
                      <td className="px-4 py-3">
                        <AccessCell value={row.clients} />
                      </td>
                      <td className="px-4 py-3">
                        <AccessCell value={row.billing} />
                      </td>
                      <td className="px-4 py-3">
                        <AccessCell value={row.staff} />
                      </td>
                      <td className="px-4 py-3">
                        <AccessCell value={row.settings} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-[#060B18] py-24">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="[font-family:var(--font-syne),system-ui,sans-serif] text-2xl font-bold text-slate-100">
              Questions or security concerns?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              If you discover a potential security vulnerability in RegiTrackr, please disclose it responsibly by
              emailing security@regitrackr.com. We review all reports and respond within 48 hours.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              For general security questions or data handling inquiries, contact support@regitrackr.com.
            </p>
            <a
              href="mailto:security@regitrackr.com"
              className="mt-6 inline-flex rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Contact security team
            </a>
            <p className="mt-8 text-xs text-slate-600">
              This page reflects RegiTrackr's security practices as of the date shown. Security practices are reviewed
              quarterly. Last reviewed: March 2026.
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
