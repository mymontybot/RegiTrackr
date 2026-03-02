import type { BillingTier, RevenueEntry, RevenueSource } from "@prisma/client";
import { onRevenueEntryChanged } from "@/lib/redis/invalidation";
import { getTenantContext } from "@/lib/services/auth.service";
import { BaseService, type BaseServiceContext } from "@/lib/services/base.service";
import { NexusService } from "@/lib/services/nexus.service";
import {
  ResourceNotFoundError,
  TenancyViolationError,
  ValidationError,
} from "@/lib/utils/errors";

export type CreateRevenueEntryInput = {
  entityId: string;
  stateCode: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  transactionCount?: number;
  source?: RevenueSource;
};

export type BulkRevenueEntryInput = CreateRevenueEntryInput[];

export type RevenueEntryFilters = {
  stateCode?: string;
  periodYear?: number;
  page?: number;
  pageSize?: number;
};

export class RevenueService extends BaseService {
  constructor(ctx: BaseServiceContext) {
    super(ctx);
  }

  static async create(clerkUserId: string): Promise<RevenueService> {
    const tenant = await getTenantContext(clerkUserId);
    return new RevenueService({
      firmId: tenant.firmId,
      userId: tenant.userId,
      billingTier: tenant.billingTier,
    });
  }

  async createEntry(data: CreateRevenueEntryInput): Promise<RevenueEntry> {
    const prisma = this.getPrisma();
    const entity = await prisma.entity.findUnique({
      where: { id: data.entityId },
      select: { id: true, firmId: true },
    });
    if (!entity) {
      throw new ResourceNotFoundError("Entity not found", { entityId: data.entityId });
    }
    this.assertFirmScope(entity);

    const entry = await prisma.revenueEntry.create({
      data: {
        entityId: data.entityId,
        firmId: this.firmId,
        stateCode: data.stateCode.toUpperCase(),
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        amount: data.amount,
        transactionCount: data.transactionCount ?? 0,
        source: data.source ?? "MANUAL",
        enteredByUserId: this.userId,
      },
    });

    // Recalculate after single-entry change.
    const nexusService = new NexusService({
      firmId: this.firmId,
      userId: this.userId,
      billingTier: this.billingTier,
    });
    await nexusService.calculateEntityNexus(data.entityId);
    await onRevenueEntryChanged(data.entityId);

    return entry;
  }

  async bulkUpsert(entries: BulkRevenueEntryInput): Promise<{ upserted: number }> {
    if (entries.length === 0) {
      return { upserted: 0 };
    }

    const prisma = this.getPrisma();
    const entityIds = [...new Set(entries.map((entry) => entry.entityId))];
    const entities = await prisma.entity.findMany({
      where: { id: { in: entityIds } },
      select: { id: true, firmId: true },
    });

    if (entities.length !== entityIds.length) {
      throw new ValidationError("One or more entities were not found");
    }
    for (const entity of entities) {
      this.assertFirmScope(entity);
    }

    let upserted = 0;
    for (const entry of entries) {
      const stateCode = entry.stateCode.toUpperCase();
      const existing = await prisma.revenueEntry.findFirst({
        where: {
          entityId: entry.entityId,
          firmId: this.firmId,
          stateCode,
          periodYear: entry.periodYear,
          periodMonth: entry.periodMonth,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.revenueEntry.update({
          where: { id: existing.id },
          data: {
            amount: entry.amount,
            transactionCount: entry.transactionCount ?? 0,
            source: entry.source ?? "CSV_IMPORT",
            enteredByUserId: this.userId,
          },
        });
      } else {
        await prisma.revenueEntry.create({
          data: {
            entityId: entry.entityId,
            firmId: this.firmId,
            stateCode,
            periodYear: entry.periodYear,
            periodMonth: entry.periodMonth,
            amount: entry.amount,
            transactionCount: entry.transactionCount ?? 0,
            source: entry.source ?? "CSV_IMPORT",
            enteredByUserId: this.userId,
          },
        });
      }
      upserted += 1;
    }

    // One recalculation pass at end (once per affected entity).
    const nexusService = new NexusService({
      firmId: this.firmId,
      userId: this.userId,
      billingTier: this.billingTier,
    });
    for (const entityId of entityIds) {
      await nexusService.calculateEntityNexus(entityId);
      await onRevenueEntryChanged(entityId);
    }

    return { upserted };
  }

  async getEntriesByEntity(
    entityId: string,
    filters: RevenueEntryFilters = {},
  ): Promise<{ data: RevenueEntry[]; page: number; pageSize: number; total: number }> {
    const prisma = this.getPrisma();
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, firmId: true },
    });
    if (!entity) {
      throw new ResourceNotFoundError("Entity not found", { entityId });
    }
    this.assertFirmScope(entity);

    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 200);
    const where = {
      entityId,
      firmId: this.firmId,
      stateCode: filters.stateCode?.toUpperCase(),
      periodYear: filters.periodYear,
    };

    const [total, data] = await Promise.all([
      prisma.revenueEntry.count({ where }),
      prisma.revenueEntry.findMany({
        where,
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, page, pageSize, total };
  }
}

export async function createRevenueServiceFromTenant(
  tenant: { firmId: string; userId: string; billingTier: BillingTier },
): Promise<RevenueService> {
  if (!tenant.firmId || !tenant.userId) {
    throw new TenancyViolationError("Invalid tenant context for revenue service creation");
  }
  return new RevenueService(tenant);
}
