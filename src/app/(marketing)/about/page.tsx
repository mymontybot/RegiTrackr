export const metadata = {
  title: "About — RegiTrackr",
  description:
    "RegiTrackr is the compliance monitoring platform built for CPA firms managing multi-state clients.",
  alternates: { canonical: "https://regitrackr.com/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <div className="inline-flex items-center gap-3">
        <span className="h-px w-10 bg-blue-500/40" />
        <span className="text-xs font-medium uppercase tracking-widest text-blue-400">About</span>
        <span className="h-px w-10 bg-blue-500/40" />
      </div>
      <h1 className="mt-4 [font-family:var(--font-syne),system-ui,sans-serif] text-3xl font-bold text-slate-100 lg:text-4xl">
        Built by someone who understands the compliance gap.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400">
        RegiTrackr was built because CPA firms managing multi-state clients had no purpose-built tool for monitoring
        economic nexus exposure before it became a liability. The existing solutions either handled the wrong part of
        the workflow or were priced for enterprise budgets.
      </p>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
        RegiTrackr is the monitoring layer that was missing: an AI-monitored threshold database, filing calendar
        management, and AI-powered compliance briefings, at a price point that works for firms of any size.
      </p>
      <p className="mt-8 text-sm text-slate-500">Questions or partnership inquiries:</p>
      <a
        href="mailto:hello@regitrackr.com"
        className="mt-2 inline-block text-blue-400 transition-colors hover:text-blue-300"
      >
        hello@regitrackr.com
      </a>
    </div>
  );
}
