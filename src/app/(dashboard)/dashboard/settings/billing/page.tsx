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
        <h1 className="text-2xl font-semibold">Billing Settings</h1>
        <p className="text-sm text-muted-foreground">
          Per-client metered billing with monthly floor enforcement.
        </p>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-base font-medium">Current Plan</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Billing tier</dt>
            <dd className="text-sm font-medium">{preview.billingTier}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Price per client</dt>
            <dd className="text-sm font-medium">{formatCurrency(preview.pricePerClient)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Active client count</dt>
            <dd className="text-sm font-medium">{preview.clientCount}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Monthly floor</dt>
            <dd className="text-sm font-medium">{formatCurrency(preview.floor)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-base font-medium">This Month&apos;s Estimated Charge</h2>
        <div className="mt-3 space-y-2 text-sm">
          <p>Subtotal ({preview.clientCount} clients): {formatCurrency(preview.subtotal)}</p>
          <p>Estimated charge: <span className="font-semibold">{formatCurrency(preview.chargeAmount)}</span></p>
          {floorApplied ? (
            <p className="text-muted-foreground">
              Monthly floor applied because subtotal is below {formatCurrency(preview.floor)}.
            </p>
          ) : null}
        </div>
      </section>

      {preview.clientCount < proThreshold ? (
        <section className="rounded-lg border bg-card p-5">
          <h2 className="text-base font-medium">Upgrade to Pro</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add {clientsToPro} more active client{clientsToPro === 1 ? "" : "s"} to reach Pro
            tier (51+ clients) and unlock AI Narrative for your team.
          </p>
          <Link
            href="/dashboard/settings/billing"
            className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Review upgrade options
          </Link>
        </section>
      ) : null}

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-base font-medium">Payment Method</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage payment methods and invoices in the Stripe customer portal.
        </p>
        <Link
          href="/api/dashboard/settings/billing/portal"
          className="mt-4 inline-flex rounded-md border px-4 py-2 text-sm font-medium"
        >
          Open Stripe customer portal
        </Link>
      </section>
    </main>
  );
}
