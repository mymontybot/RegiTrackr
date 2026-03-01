import type { BillingTier, PrismaClient } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/services/auth.service";
import { TenancyViolationError } from "@/lib/utils/errors";

export type BaseServiceContext = {
  firmId: string;
  userId: string;
  billingTier: BillingTier;
};

export class BaseService {
  protected readonly firmId: string;
  protected readonly userId: string;
  protected readonly billingTier: BillingTier;

  constructor({ firmId, userId, billingTier }: BaseServiceContext) {
    this.firmId = firmId;
    this.userId = userId;
    this.billingTier = billingTier;
  }

  protected assertFirmScope(record: { firmId: string }): void {
    if (record.firmId !== this.firmId) {
      throw new TenancyViolationError("Cross-tenant record access blocked", {
        expectedFirmId: this.firmId,
        recordFirmId: record.firmId,
        userId: this.userId,
      });
    }
  }

  protected getPrisma(): PrismaClient {
    return prisma;
  }

  static async create(clerkUserId: string): Promise<BaseService> {
    const tenant = await getTenantContext(clerkUserId);
    return new BaseService({
      firmId: tenant.firmId,
      userId: tenant.userId,
      billingTier: tenant.billingTier,
    });
  }
}
