"use client";

import {
  Activity,
  Calendar,
  ChevronDown,
  FileText,
  Menu,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const PRODUCT_ITEMS = [
  {
    icon: Activity,
    label: "Nexus Monitoring",
    sub: "Real-time threshold tracking across all 50 states",
    href: "/#features",
  },
  {
    icon: Calendar,
    label: "Filing Calendar",
    sub: "Deadline management for every client",
    href: "/#features",
  },
  {
    icon: Sparkles,
    label: "AI Narrative",
    sub: "Plain-English compliance briefings in 8 seconds",
    href: "/#features",
  },
  {
    icon: Users,
    label: "Client Portal",
    sub: "White-labeled portal for your clients",
    href: "/#features",
  },
  {
    icon: FileText,
    label: "AI Disclaimer",
    sub: "How the AI feature works and what it does not do",
    href: "/ai-disclaimer-public",
  },
];

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  const className = `text-sm transition-colors cursor-pointer ${
    active ? "text-slate-100" : "text-slate-400 hover:text-slate-100"
  }`;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function MarketingNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductOpen, setMobileProductOpen] = useState(false);

  const closeMobile = () => {
    setMobileMenuOpen(false);
    setMobileProductOpen(false);
  };

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/[0.06] bg-[#060B18]/90 backdrop-blur-sm"
        style={{ borderBottomWidth: "1px" }}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link
            href="/"
            className="[font-family:var(--font-syne),system-ui,sans-serif] text-lg font-bold text-slate-100"
          >
            RegiTrackr
          </Link>

          {/* Desktop nav — hidden below lg */}
          <nav className="hidden items-center gap-8 lg:flex">
            <div className="group relative">
              <span className="flex cursor-pointer items-center text-sm text-slate-400 transition-colors hover:text-slate-100">
                Product
                <ChevronDown className="ml-1 h-3 w-3" />
              </span>
              <div className="invisible absolute left-0 top-full -mt-1 pt-1 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                <div className="min-w-[240px] rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-2 shadow-xl">
                  {PRODUCT_ITEMS.slice(0, 4).map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        className="flex items-start gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[#111D35]"
                      >
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                          <Icon className="h-4 w-4 text-blue-400" />
                        </span>
                        <span>
                          <span className="text-sm font-medium text-slate-100">{item.label}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{item.sub}</span>
                        </span>
                      </Link>
                    );
                  })}
                  <div className="my-1 border-t border-[#1E2D4A]" />
                  {PRODUCT_ITEMS.slice(4).map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        className="flex items-start gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[#111D35]"
                      >
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                          <Icon className="h-4 w-4 text-blue-400" />
                        </span>
                        <span>
                          <span className="text-sm font-medium text-slate-100">{item.label}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{item.sub}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            <NavLink href="/pricing" active={pathname === "/pricing"}>
              Pricing
            </NavLink>
            <NavLink href="/security" active={pathname === "/security"}>
              Security
            </NavLink>
            <NavLink href="/about" active={pathname === "/about"}>
              About
            </NavLink>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/sign-in"
              className="text-sm text-slate-400 transition-colors hover:text-slate-100"
            >
              Sign in
            </Link>
            <a
              href="/#waitlist"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Join waitlist
            </a>
          </div>

          {/* Mobile: hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center justify-center p-2 text-slate-400 hover:text-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#060B18] pt-20 px-6 lg:hidden"
          role="dialog"
          aria-label="Mobile menu"
        >
          <button
            type="button"
            onClick={closeMobile}
            className="absolute right-6 top-6 text-slate-400 hover:text-slate-100"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>

          <nav className="flex flex-col">
            <div className="border-b border-[#1E2D4A]">
              <button
                type="button"
                onClick={() => setMobileProductOpen(!mobileProductOpen)}
                className="flex w-full items-center justify-between py-4 text-base text-slate-300 transition-colors hover:text-slate-100"
              >
                Product
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${mobileProductOpen ? "rotate-180" : ""}`}
                />
              </button>
              {mobileProductOpen ? (
                <div className="pb-2 pl-2">
                  {PRODUCT_ITEMS.map((item) => (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={closeMobile}
                      className="block py-2 text-sm text-slate-400 hover:text-slate-100"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <Link
              href="/pricing"
              onClick={closeMobile}
              className={`border-b border-[#1E2D4A] py-4 text-base transition-colors hover:text-slate-100 ${
                pathname === "/pricing" ? "text-slate-100" : "text-slate-300"
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/security"
              onClick={closeMobile}
              className={`border-b border-[#1E2D4A] py-4 text-base transition-colors hover:text-slate-100 ${
                pathname === "/security" ? "text-slate-100" : "text-slate-300"
              }`}
            >
              Security
            </Link>
            <Link
              href="/about"
              onClick={closeMobile}
              className={`border-b border-[#1E2D4A] py-4 text-base transition-colors hover:text-slate-100 ${
                pathname === "/about" ? "text-slate-100" : "text-slate-300"
              }`}
            >
              About
            </Link>
            <Link
              href="/sign-in"
              onClick={closeMobile}
              className="border-b border-[#1E2D4A] py-4 text-base text-slate-300 transition-colors hover:text-slate-100"
            >
              Sign in
            </Link>
            <a
              href="/#waitlist"
              onClick={closeMobile}
              className="mt-4 block w-full rounded-lg bg-blue-500 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Join waitlist
            </a>
          </nav>
        </div>
      ) : null}
    </>
  );
}
