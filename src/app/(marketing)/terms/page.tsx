import Link from "next/link";

export const metadata = {
  title: "Terms of Service | RegiTrackr",
  description: "Terms of Service for RegiTrackr compliance monitoring platform.",
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-slate-100">Terms of Service</h1>
          <p className="text-sm text-slate-500">Last updated: March 2026</p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">1. Service description</h2>
          <p>
            RegiTrackr is a compliance monitoring tool for accounting professionals and CPA firms. The service
            provides nexus threshold monitoring, filing deadline calendars, and related workflow features. RegiTrackr
            is not a tax advisor and does not provide tax, legal, or professional advice. You are responsible for
            obtaining any such advice from qualified professionals.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">2. Acceptable use</h2>
          <p>
            You agree to use RegiTrackr only for lawful purposes and in accordance with these Terms. You may not use the
            service to violate any applicable law, infringe third-party rights, transmit malicious code, attempt to gain
            unauthorized access to any system or data, or use the service in any way that could harm RegiTrackr or its
            users. We may suspend or terminate access for conduct that we reasonably believe violates these terms.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">3. AI-generated content disclaimer</h2>
          <p>
            RegiTrackr may present AI-generated narratives and summaries (e.g., nexus exposure briefings) for
            informational and workflow convenience only. Such content is not tax, legal, or professional advice. You are
            solely responsible for verifying all information before relying on it for any decision or client work. We do
            not guarantee the accuracy, completeness, or suitability of AI-generated content for any particular purpose.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">4. Data handling</h2>
          <p>
            We store your data using industry-standard encryption and do not sell your data to third parties. Our use of
            data is described in our Privacy Policy. You retain ownership of your data; by using the service you grant us
            the rights necessary to operate, store, and process your data in accordance with our policies and applicable
            law.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">5. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, RegiTrackr and its affiliates, officers, and employees shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of
            profits, data, or goodwill, arising from your use of the service or these Terms. Our total liability for any
            claims arising from or related to the service or these Terms shall not exceed the amount you paid us in the
            twelve (12) months preceding the claim. Some jurisdictions do not allow certain limitations of liability; in
            such jurisdictions, our liability will be limited to the greatest extent permitted by law.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">6. Governing law</h2>
          <p>
            These Terms are governed by the laws of the State of Delaware, without regard to its conflict of laws
            principles. Any dispute arising from these Terms or the service shall be resolved exclusively in the state
            or federal courts located in Delaware, and you consent to the personal jurisdiction of such courts.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">7. Contact</h2>
          <p>
            For questions about these Terms or legal matters, contact us at{" "}
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
