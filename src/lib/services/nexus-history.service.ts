import type { BillingTier } from "@prisma/client";
import { getTenantContext } from "@/lib/services/auth.service";
import { BaseService, type BaseServiceContext } from "@/lib/services/base.service";
import { findTriggerDates, type NexusTriggerHistory } from "@/lib/engines/nexus-history.engine";
import { ResourceNotFoundError } from "@/lib/utils/errors";

export class NexusHistoryService extends BaseService {
  constructor(ctx: BaseServiceContext) {
    super(ctx);
  }

  static async create(clerkUserId: string): Promise<NexusHistoryService> {
    const tenant = await getTenantContext(clerkUserId);
    return new NexusHistoryService({
      firmId: tenant.firmId,
      userId: tenant.userId,
      billingTier: tenant.billingTier,
    });
  }

  async getTriggerHistory(entityId: string, stateCode: string): Promise<NexusTriggerHistory> {
    const entity = await this.getPrisma().entity.findUnique({
      where: { id: entityId },
      select: { id: true, firmId: true },
    });
    if (!entity) {
      throw new ResourceNotFoundError("Entity not found", { entityId });
    }
    this.assertFirmScope(entity);

    const [entries, threshold, registration] = await Promise.all([
      this.getPrisma().revenueEntry.findMany({
        where: {
          firmId: this.firmId,
          entityId,
          stateCode: stateCode.toUpperCase(),
        },
        select: {
          entityId: true,
          stateCode: true,
          periodYear: true,
          periodMonth: true,
          amount: true,
        },
      }),
      this.getPrisma().stateThreshold.findFirst({
        where: {
          stateCode: stateCode.toUpperCase(),
        },
        orderBy: { version: "desc" },
        select: {
          stateCode: true,
          stateName: true,
          salesThreshold: true,
          measurementPeriod: true,
        },
      }),
      this.getPrisma().nexusRegistration.findFirst({
        where: {
          firmId: this.firmId,
          entityId,
          stateCode: stateCode.toUpperCase(),
        },
        orderBy: { updatedAt: "desc" },
        select: { status: true },
      }),
    ]);

    if (!threshold) {
      throw new ResourceNotFoundError("State threshold not found", { stateCode });
    }

    return findTriggerDates(entityId, stateCode.toUpperCase(), entries.map((entry) => ({
      entityId: entry.entityId,
      stateCode: entry.stateCode,
      periodYear: entry.periodYear,
      periodMonth: entry.periodMonth,
      amount: Number(entry.amount),
    })), {
      stateCode: threshold.stateCode,
      stateName: threshold.stateName,
      salesThreshold: threshold.salesThreshold ? Number(threshold.salesThreshold) : null,
      measurementPeriod: threshold.measurementPeriod,
      registrationStatus: registration?.status,
    });
  }

  async getTriggerHistoryForAllStates(entityId: string): Promise<NexusTriggerHistory[]> {
    const entity = await this.getPrisma().entity.findUnique({
      where: { id: entityId },
      select: { id: true, firmId: true },
    });
    if (!entity) {
      throw new ResourceNotFoundError("Entity not found", { entityId });
    }
    this.assertFirmScope(entity);

    const states = await this.getPrisma().revenueEntry.findMany({
      where: {
        firmId: this.firmId,
        entityId,
      },
      distinct: ["stateCode"],
      orderBy: { stateCode: "asc" },
      select: { stateCode: true },
    });

    const output: NexusTriggerHistory[] = [];
    for (const state of states) {
      output.push(await this.getTriggerHistory(entityId, state.stateCode));
    }
    return output;
  }
}

export async function createNexusHistoryServiceFromTenant(tenant: {
  firmId: string;
  userId: string;
  billingTier: BillingTier;
}): Promise<NexusHistoryService> {
  return new NexusHistoryService(tenant);
}
