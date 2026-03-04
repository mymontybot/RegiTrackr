import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

const appearance = {
  variables: {
    colorBackground: "#0D1526",
    colorInputBackground: "#060B18",
    colorInputText: "#F1F5F9",
    colorText: "#CBD5E1",
    colorTextSecondary: "#94A3B8",
    colorPrimary: "#3B82F6",
    colorDanger: "#F87171",
    borderRadius: "0.5rem",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  elements: {
    card: "bg-transparent shadow-none border-none p-0",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border border-[#1E2D4A] bg-[#060B18] text-slate-300 hover:bg-[#111D35] transition-colors",
    dividerLine: "bg-[#1E2D4A]",
    dividerText: "text-slate-600",
    formFieldInput:
      "bg-[#060B18] border border-[#1E2D4A] text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
    formFieldLabel: "text-slate-400 text-xs font-medium",
    formButtonPrimary:
      "bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors",
    footerActionLink: "text-blue-400 hover:text-blue-300",
    identityPreviewEditButton: "text-blue-400",
  },
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen bg-[#060B18]">
      {/* Left panel - hidden on mobile */}
      <aside className="hidden w-1/2 flex-col border-r border-[#1E2D4A] bg-[#0D1526] lg:flex">
        <div className="flex flex-1 flex-col p-8">
          <Link
            href="/"
            className="[font-family:var(--font-syne),system-ui,sans-serif] text-xl font-bold text-slate-100"
          >
            RegiTrackr
          </Link>
          <div className="flex flex-1 flex-col justify-center">
            <h2 className="max-w-xs text-2xl font-bold text-slate-100">
              Replace the spreadsheet. Protect the practice.
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Join CPA firms using RegiTrackr to monitor multi-state nexus
              exposure and never miss a filing deadline.
            </p>
          </div>
          <p className="text-xs text-slate-600">© 2026 RegiTrackr</p>
        </div>
      </aside>

      {/* Right panel - form */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 text-xl font-semibold text-slate-100">
            Create your firm account
          </h1>
          <SignUp appearance={appearance} afterSignUpUrl="/onboarding" />
          <p className="mx-auto mt-4 max-w-sm text-center text-xs leading-relaxed text-slate-600">
            By creating an account you agree to our{" "}
            <a href="/terms" className="text-slate-400 underline hover:text-slate-300">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-slate-400 underline hover:text-slate-300">
              Privacy Policy
            </a>
            . RegiTrackr subscriptions renew automatically. Cancel any time in account settings.
          </p>
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-blue-400 hover:text-blue-300"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
