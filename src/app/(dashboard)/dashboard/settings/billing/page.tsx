import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/services/auth.service";
import { getInvoicePreview } from "@/lib/services/billing.service";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function BillingSettingsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Tenant scope always comes from auth context, never from request input.
  const tenant = await getTenantContext(userId);
  const preview = await getInvoicePreview(tenant.firmId);
  const floorApplied = preview.chargeAmount === preview.floor && preview.subtotal < preview.floor;
  const proThreshold = 51;
  const clientsToPro = Math.max(proThreshold - preview.clientCount, 0);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-100">Billing Settings</h1>
        <p className="text-sm text-slate-500">
          Per-client metered billing with monthly floor enforcement.
        </p>
      </div>

      <section className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
        <h2 className="text-base font-semibold text-slate-100">Current Plan</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Billing tier</dt>
            <dd className="text-sm font-medium text-slate-100">{preview.billingTier}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Price per client</dt>
            <dd className="text-sm font-medium font-mono text-slate-100">{formatCurrency(preview.pricePerClient)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Active client count</dt>
            <dd className="text-sm font-medium font-mono text-slate-100">{preview.clientCount}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Monthly floor</dt>
            <dd className="text-sm font-medium font-mono text-slate-100">{formatCurrency(preview.floor)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
        <h2 className="text-base font-semibold text-slate-100">This Month&apos;s Estimated Charge</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          <p>Subtotal ({preview.clientCount} clients): <span className="font-mono">{formatCurrency(preview.subtotal)}</span></p>
          <p>Estimated charge: <span className="font-mono font-semibold text-slate-100">{formatCurrency(preview.chargeAmount)}</span></p>
          {floorApplied ? (
            <p className="text-slate-500">
              Monthly floor applied because subtotal is below {formatCurrency(preview.floor)}.
            </p>
          ) : null}
        </div>
      </section>

      {preview.clientCount < proThreshold ? (
        <section className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
          <h2 className="text-base font-semibold text-slate-100">Upgrade to Pro</h2>
          <p className="mt-2 text-sm text-slate-500">
            Add {clientsToPro} more active client{clientsToPro === 1 ? "" : "s"} to reach Pro
            tier (51+ clients) and unlock AI Narrative for your team.
          </p>
          <Link
            href="/dashboard/settings/billing"
            className="mt-4 inline-flex rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Review upgrade options
          </Link>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]">
        <h2 className="text-base font-semibold text-slate-100">Payment Method</h2>
        <p className="mt-2 text-sm text-slate-500">
          Manage payment methods and invoices in the Stripe customer portal.
        </p>
        <Link
          href="/api/dashboard/settings/billing/portal"
          className="mt-4 inline-flex rounded-lg border border-[#2A3F66] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100"
        >
          Open Stripe customer portal
        </Link>
      </section>
    </main>
  );
}
