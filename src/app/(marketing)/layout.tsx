import { Inter, Syne } from "next/font/google";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${syne.variable} ${inter.variable} min-h-screen bg-[#060B18] font-sans text-slate-100 antialiased`}
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <MarketingNav />
      <main className="pt-16">{children}</main>

      <footer className="border-t border-[#1E2D4A] bg-[#060B18] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-12 border-b border-[#1E2D4A] pb-12 lg:grid-cols-4">
            <div>
              <Link
                href="/"
                className="[font-family:var(--font-syne),system-ui,sans-serif] text-lg font-bold text-slate-100"
              >
                RegiTrackr
              </Link>
              <p className="mt-3 max-w-[200px] text-xs leading-relaxed text-slate-500">
                The compliance monitoring platform for CPA firms managing multi-state clients.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Product
              </h3>
              <Link href="/#features" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                Nexus Monitoring
              </Link>
              <Link href="/#features" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                Filing Calendar
              </Link>
              <Link href="/#features" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                AI Narrative
              </Link>
              <Link href="/#features" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                Client Portal
              </Link>
              <Link href="/pricing" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                Pricing
              </Link>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Company
              </h3>
              <Link href="/about" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                About
              </Link>
              <Link href="/security" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                Security
              </Link>
              <Link href="/ai-disclaimer-public" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                AI Disclaimer
              </Link>
              <a href="mailto:hello@regitrackr.com" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                Contact
              </a>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Legal
              </h3>
              <Link href="/privacy" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                Privacy Policy
              </Link>
              <Link href="/terms" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                Terms of Service
              </Link>
              <Link href="/cookies" className="mb-2 block text-sm text-slate-500 transition-colors hover:text-slate-300">
                Cookie Policy
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 pt-8 sm:flex-row">
            <p className="text-xs text-slate-600">© 2026 RegiTrackr. All rights reserved.</p>
            <p className="text-xs text-slate-600">Made for CPA firms.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
