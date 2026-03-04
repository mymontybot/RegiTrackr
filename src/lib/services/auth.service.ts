import { cache } from "react";
import type { BillingTier, UserRole } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { AuthError } from "@/lib/utils/errors";

export type TenantContext = {
  firmId: string;
  role: UserRole;
  billingTier: BillingTier;
  userId: string;
};

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

  while (await prisma.firm.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}

async function bootstrapTenantFromClerk(clerkUserId: string): Promise<void> {
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);

    const primaryEmail =
      clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      `${clerkUserId}@users.clerk.local`;

    const unsafeMetadata = clerkUser.unsafeMetadata as Record<string, unknown> | null | undefined;
    const publicMetadata = clerkUser.publicMetadata as Record<string, unknown> | null | undefined;
    const metadataFirmName =
      (typeof unsafeMetadata?.firmName === "string" && unsafeMetadata.firmName) ||
      (typeof publicMetadata?.firmName === "string" && publicMetadata.firmName);
    const normalizedMetadataFirmName =
      typeof metadataFirmName === "string" ? metadataFirmName.trim() : "";

    const fallbackFirmName = clerkUser.firstName?.trim()
      ? `${clerkUser.firstName.trim()} Firm`
      : `${primaryEmail.split("@")[0]} Firm`;
    const firmName = normalizedMetadataFirmName || fallbackFirmName;
    const firmSlug = await getUniqueFirmSlug(toSlug(firmName));
    const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();

    await prisma.user.upsert({
      where: { clerkUserId },
      update: {},
      create: {
        clerkUserId,
        email: primaryEmail.toLowerCase(),
        name: displayName || null,
        role: "FIRM_ADMIN",
        firm: {
          create: {
            name: firmName,
            slug: firmSlug,
            billingTier: "STARTER",
            billingStatus: "ACTIVE",
            activeClientCount: 0,
            monthlyFloor: 99,
            pricePerClient: 2500,
          },
        },
      },
    });
  } catch {
    // If Clerk API fetch fails, caller will throw a standard auth context error.
  }
}

const loadTenantContext = cache(async (clerkUserId: string): Promise<TenantContext> => {
  let user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      firmId: true,
      role: true,
      firm: {
        select: {
          billingTier: true,
        },
      },
    },
  });

  if (!user?.firm) {
    await bootstrapTenantFromClerk(clerkUserId);

    user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        firmId: true,
        role: true,
        firm: {
          select: {
            billingTier: true,
          },
        },
      },
    });
  }

  if (!user?.firm) {
    throw new AuthError("No tenant context found for authenticated user");
  }

  return {
    firmId: user.firmId,
    role: user.role,
    billingTier: user.firm.billingTier,
    userId: user.id,
  };
});

export async function getTenantContext(clerkUserId: string): Promise<TenantContext> {
  if (!clerkUserId) {
    throw new AuthError("Missing Clerk user ID");
  }

  return loadTenantContext(clerkUserId);
}
