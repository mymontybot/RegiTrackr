import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { handleStripeWebhookEvent } from "@/lib/services/billing.service";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(secretKey);
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid Stripe webhook signature",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }

  await handleStripeWebhookEvent(event);

  return NextResponse.json({ received: true });
}
