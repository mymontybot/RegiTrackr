import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import prisma from "@/lib/db/prisma";

type ClerkUserData = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{
    id: string;
    email_address: string;
  }>;
  public_metadata?: Record<string, unknown>;
  unsafe_metadata?: Record<string, unknown>;
};

type ClerkWebhookEvent =
  | {
      type: "user.created";
      data: ClerkUserData;
    }
  | {
      type: "user.deleted";
      data: { id: string };
    }
  | {
      type: string;
      data: Record<string, unknown>;
    };

function isUserCreatedEvent(
  event: ClerkWebhookEvent,
): event is Extract<ClerkWebhookEvent, { type: "user.created" }> {
  return event.type === "user.created";
}

function isUserDeletedEvent(
  event: ClerkWebhookEvent,
): event is Extract<ClerkWebhookEvent, { type: "user.deleted" }> {
  return event.type === "user.deleted";
}

function getPrimaryEmail(user: ClerkUserData): string | null {
  const primaryEmail =
    user.email_addresses?.find((email) => email.id === user.primary_email_address_id)
      ?.email_address ?? user.email_addresses?.[0]?.email_address;

  return primaryEmail?.toLowerCase() ?? null;
}

function toSlug(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "firm";
}

async function getUniqueFirmSlug(baseSlug: string): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;

  // Keep trying until a unique slug is found.
  while (await prisma.firm.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}

function getFirmName(user: ClerkUserData, email: string): string {
  const metadataFirmName =
    (typeof user.unsafe_metadata?.firmName === "string" && user.unsafe_metadata.firmName) ||
    (typeof user.public_metadata?.firmName === "string" && user.public_metadata.firmName);

  if (metadataFirmName && metadataFirmName.trim().length > 0) {
    return metadataFirmName.trim();
  }

  if (user.first_name?.trim()) {
    return `${user.first_name.trim()} Firm`;
  }

  const emailPrefix = email.split("@")[0];
  return `${emailPrefix} Firm`;
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Missing CLERK_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const webhook = new Webhook(secret);

  let event: ClerkWebhookEvent;
  try {
    event = webhook.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (isUserCreatedEvent(event)) {
    const clerkUserId = event.data.id;
    const email = getPrimaryEmail(event.data);

    if (!email) {
      return NextResponse.json({ error: "No email found on Clerk user" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!existingUser) {
      const firmName = getFirmName(event.data, email);
      const slug = await getUniqueFirmSlug(toSlug(firmName));
      const displayName = [event.data.first_name, event.data.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      await prisma.$transaction(async (tx) => {
        const firm = await tx.firm.create({
          data: {
            name: firmName,
            slug,
            billingTier: "STARTER",
            billingStatus: "ACTIVE",
            activeClientCount: 0,
            monthlyFloor: 99,
            pricePerClient: 2500,
          },
        });

        await tx.user.create({
          data: {
            clerkUserId,
            firmId: firm.id,
            email,
            name: displayName || null,
            role: "FIRM_ADMIN",
          },
        });
      });
    }
  }

  if (isUserDeletedEvent(event)) {
    const clerkUserId = event.data.id;
    const existingUser = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: "Deleted User",
          email: `deleted+${existingUser.id}@deleted.local`,
          role: "READ_ONLY",
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
