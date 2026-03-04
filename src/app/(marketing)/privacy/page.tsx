import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | RegiTrackr",
  description: "Privacy Policy for RegiTrackr — how we collect, store, and protect your data.",
};

export default function PrivacyPage() {
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
        <article className="prose prose-invert mx-auto max-w-3xl px-4 py-24 text-slate-300 sm:px-6 lg:px-8 prose-headings:text-slate-100 prose-p:leading-relaxed prose-ul:leading-relaxed">
          <h1 className="text-3xl font-bold text-slate-100">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: March 2026</p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">1. Data we collect</h2>
          <p>
            We collect only what is necessary to provide and improve the service:
          </p>
          <ul>
            <li>
              <strong className="text-slate-200">Account and identity:</strong> Email address, name, and authentication
              data (handled by our identity provider).
            </li>
            <li>
              <strong className="text-slate-200">Firm data:</strong> Firm name, staff and role information, client and
              entity records, and related workflow and settings.
            </li>
            <li>
              <strong className="text-slate-200">Revenue and compliance data:</strong> Revenue entries by state and
              period, nexus registration status, filing deadlines, and similar data you enter for compliance monitoring.
            </li>
          </ul>
          <p>
            We do not sell your data. We use it to operate the service, support you, and improve our product in
            accordance with this policy and our Terms of Service.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">2. How we store your data</h2>
          <p>
            Your data is stored in Supabase (PostgreSQL). Data is encrypted at rest using industry-standard encryption.
            Access is restricted to authorized systems and personnel and is used only to run the service, respond to
            incidents, and meet legal obligations.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">3. Third-party services</h2>
          <p>
            We use a small number of trusted third parties to operate the service. Each processes data only as needed for
            their role:
          </p>
          <ul>
            <li>
              <strong className="text-slate-200">Clerk:</strong> Authentication and user identity. Clerk processes
              your login and account data in accordance with their privacy policy.
            </li>
            <li>
              <strong className="text-slate-200">Stripe:</strong> Billing and subscription management. Payment and
              billing data are processed by Stripe; we do not store full payment card numbers.
            </li>
            <li>
              <strong className="text-slate-200">Anthropic:</strong> AI-powered features (e.g., nexus narratives).
              Data sent to Anthropic is used only to generate responses for your account. It is not used to train
              Anthropic’s models.
            </li>
          </ul>
          <p>
            We do not sell or share your data with third parties for their marketing or advertising. We require
            processors to protect your data under appropriate agreements.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">4. Your rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data. We will honor deletion requests
            subject to legal and operational requirements (e.g., retention for disputes or compliance). To request
            deletion or exercise other privacy rights, contact us at{" "}
            <a href="mailto:legal@regitrackr.com" className="text-blue-400 hover:text-blue-300">
              legal@regitrackr.com
            </a>
            . We will respond within a reasonable time. If you are in a jurisdiction with additional rights (e.g., GDPR,
            CCPA), we will comply to the extent applicable.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">5. Contact</h2>
          <p>
            For privacy-related questions or requests, contact us at{" "}
            <a href="mailto:legal@regitrackr.com" className="text-blue-400 hover:text-blue-300">
              legal@regitrackr.com
            </a>
            .
          </p>
        </article>
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
