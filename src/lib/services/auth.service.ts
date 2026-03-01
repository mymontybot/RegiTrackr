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

const loadTenantContext = cache(async (clerkUserId: string): Promise<TenantContext> => {
  const user = await prisma.user.findUnique({
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
