import * as Sentry from "@sentry/nextjs";
import type { BillingStatus, BillingTier } from "@prisma/client";
import type Stripe from "stripe";
import StripeClient from "stripe";
import { Resend } from "resend";
import prisma from "@/lib/db/prisma";
import { ResourceNotFoundError } from "@/lib/utils/errors";

export type BillingContext = {
  billingTier: BillingTier;
  activeClientCount: number;
  pricePerClient: number;
  monthlyFloor: number;
};

export type InvoicePreview = {
  clientCount: number;
  pricePerClient: number;
  subtotal: number;
  floor: number;
  chargeAmount: number;
  billingTier: BillingTier;
};

const BILLING_PRICES: Record<Exclude<BillingTier, "ENTERPRISE">, number> = {
  STARTER: 2500,
  GROWTH: 2000,
  PRO: 1500,
};

const BILLING_TIER_ORDER: Record<BillingTier, number> = {
  STARTER: 0,
  GROWTH: 1,
  PRO: 2,
  ENTERPRISE: 3,
};

function tierForClientCount(activeClientCount: number): Exclude<BillingTier, "ENTERPRISE"> {
  if (activeClientCount >= 51) return "PRO";
  if (activeClientCount >= 11) return "GROWTH";
  return "STARTER";
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new StripeClient(secretKey);
}

export async function getBillingContext(firmId: string): Promise<BillingContext> {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: {
      billingTier: true,
      activeClientCount: true,
      pricePerClient: true,
      monthlyFloor: true,
    },
  });

  if (!firm) {
    throw new ResourceNotFoundError("Firm not found for billing context", { firmId });
  }

  return firm;
}

export async function calculateMonthlyCharge(firmId: string): Promise<number> {
  const ctx = await getBillingContext(firmId);
  return Math.max(ctx.activeClientCount * ctx.pricePerClient, ctx.monthlyFloor);
}

export async function createStripeCustomer(
  firmId: string,
  email: string,
  firmName: string,
): Promise<string> {
  const stripe = getStripeClient();

  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { id: true, stripeCustomerId: true },
  });

  if (!firm) {
    throw new ResourceNotFoundError("Firm not found for Stripe customer creation", { firmId });
  }

  if (firm.stripeCustomerId) {
    return firm.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    name: firmName,
    metadata: { firmId },
  });

  await prisma.firm.update({
    where: { id: firmId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function syncClientCount(
  firmId: string,
): Promise<{ synced: boolean; clientCount: number }> {
  const stripe = getStripeClient();

  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: {
      activeClientCount: true,
      stripeSubscriptionId: true,
    },
  });

  if (!firm) {
    throw new ResourceNotFoundError("Firm not found for Stripe sync", { firmId });
  }

  if (!firm.stripeSubscriptionId) {
    return { synced: false, clientCount: firm.activeClientCount };
  }

  const subscription = await stripe.subscriptions.retrieve(firm.stripeSubscriptionId);
  const item = subscription.items.data[0];

  if (!item) {
    return { synced: false, clientCount: firm.activeClientCount };
  }

  await stripe.subscriptionItems.update(item.id, {
    quantity: firm.activeClientCount,
    proration_behavior: "create_prorations",
  });

  return { synced: true, clientCount: firm.activeClientCount };
}

export async function getInvoicePreview(firmId: string): Promise<InvoicePreview> {
  const billing = await getBillingContext(firmId);
  const subtotal = billing.activeClientCount * billing.pricePerClient;
  const chargeAmount = Math.max(subtotal, billing.monthlyFloor);

  return {
    clientCount: billing.activeClientCount,
    pricePerClient: billing.pricePerClient,
    subtotal,
    floor: billing.monthlyFloor,
    chargeAmount,
    billingTier: billing.billingTier,
  };
}

export async function createCustomerPortalSessionUrl(
  firmId: string,
  returnUrl: string,
): Promise<string> {
  const stripe = getStripeClient();

  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { stripeCustomerId: true },
  });

  if (!firm?.stripeCustomerId) {
    throw new ResourceNotFoundError("Stripe customer not found for firm", { firmId });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: firm.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function promoteTier(firmId: string): Promise<BillingContext> {
  const current = await getBillingContext(firmId);

  // ENTERPRISE is negotiated and managed manually.
  if (current.billingTier === "ENTERPRISE") {
    return current;
  }

  const countBasedTier = tierForClientCount(current.activeClientCount);
  const newPricePerClient = BILLING_PRICES[countBasedTier];

  // Auto-upgrade tier labels only; never auto-demote labels.
  const upgradedTier =
    BILLING_TIER_ORDER[countBasedTier] > BILLING_TIER_ORDER[current.billingTier]
      ? countBasedTier
      : current.billingTier;

  const updated = await prisma.firm.update({
    where: { id: firmId },
    data: {
      billingTier: upgradedTier,
      // Demotions still apply immediate price-per-client changes.
      pricePerClient: newPricePerClient,
    },
    select: {
      billingTier: true,
      activeClientCount: true,
      pricePerClient: true,
      monthlyFloor: true,
    },
  });

  return updated;
}

export async function reconcileClientCount(
  firmId: string,
): Promise<{ expected: number; actual: number; corrected: boolean }> {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { activeClientCount: true },
  });

  if (!firm) {
    throw new ResourceNotFoundError("Firm not found for reconciliation", { firmId });
  }

  // Client.status is planned but not in the current schema yet; count all clients for now.
  const actual = await prisma.client.count({ where: { firmId } });
  const expected = firm.activeClientCount;

  if (actual !== expected) {
    await prisma.firm.update({
      where: { id: firmId },
      data: { activeClientCount: actual },
    });

    Sentry.captureMessage("Billing client count mismatch corrected", {
      level: "warning",
      tags: { errorType: "billing_reconcile_mismatch" },
      extra: { firmId, expected, actual },
    });

    return { expected, actual, corrected: true };
  }

  return { expected, actual, corrected: false };
}

async function sendPaymentFailureWarningEmail(firmId: string) {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { supportEmail: true, name: true, billingTier: true, activeClientCount: true },
  });

  if (!firm?.supportEmail || !process.env.RESEND_API_KEY) {
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "billing@regitrackr.app",
    to: firm.supportEmail,
    subject: "RegiTrackr billing payment failed",
    text: [
      `Hi ${firm.name},`,
      "",
      "Your latest RegiTrackr invoice payment failed.",
      `Tier: ${firm.billingTier}`,
      `Active clients: ${firm.activeClientCount}`,
      "",
      "Please update your payment method in Stripe to avoid service interruption.",
    ].join("\n"),
  });
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  if (event.type === "customer.subscription.created") {
    const subscription = event.data.object as Stripe.Subscription;
    const stripeCustomerId =
      typeof subscription.customer === "string" ? subscription.customer : null;

    if (!stripeCustomerId) return;

    await prisma.firm.updateMany({
      where: { stripeCustomerId },
      data: { stripeSubscriptionId: subscription.id },
    });

    return;
  }

  let billingStatus: BillingStatus | null = null;
  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;

  if (event.type === "invoice.payment_succeeded") {
    billingStatus = "ACTIVE";
    const invoice = event.data.object as Stripe.Invoice;
    stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;
  } else if (event.type === "invoice.payment_failed") {
    billingStatus = "PAST_DUE";
    const invoice = event.data.object as Stripe.Invoice;
    stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;
  } else if (event.type === "customer.subscription.deleted") {
    billingStatus = "CANCELLED";
    const subscription = event.data.object as Stripe.Subscription;
    stripeCustomerId =
      typeof subscription.customer === "string" ? subscription.customer : null;
    stripeSubscriptionId = subscription.id;
  } else {
    return;
  }

  let affectedFirmId: string | null = null;

  if (stripeSubscriptionId) {
    const result = await prisma.firm.updateMany({
      where: { stripeSubscriptionId },
      data: { billingStatus },
    });

    if (result.count > 0) {
      const firm = await prisma.firm.findFirst({
        where: { stripeSubscriptionId },
        select: { id: true },
      });
      affectedFirmId = firm?.id ?? null;
    }
  }

  if (!affectedFirmId && stripeCustomerId) {
    const result = await prisma.firm.updateMany({
      where: { stripeCustomerId },
      data: { billingStatus },
    });
    if (result.count > 0) {
      const firm = await prisma.firm.findFirst({
        where: { stripeCustomerId },
        select: { id: true },
      });
      affectedFirmId = firm?.id ?? null;
    }
  }

  if (event.type === "invoice.payment_failed" && affectedFirmId) {
    await sendPaymentFailureWarningEmail(affectedFirmId);
  }
}
