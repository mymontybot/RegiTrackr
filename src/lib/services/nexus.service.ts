import type { Alert, AlertType, NexusBand as PrismaNexusBand } from "@prisma/client";
import { calculateNexus, type NexusAlert, type NexusResult } from "@/lib/engines/nexus.engine";
import { onRevenueEntryChanged } from "@/lib/redis/invalidation";
import { BaseService, type BaseServiceContext } from "@/lib/services/base.service";
import { getTenantContext } from "@/lib/services/auth.service";
import {
  ResourceNotFoundError,
  TenancyViolationError,
  ValidationError,
} from "@/lib/utils/errors";

type AlertFilters = {
  stateCode?: string;
  alertTypes?: AlertType[];
  unreadOnly?: boolean;
};

const ALERT_PRIORITY: Record<AlertType, number> = {
  TRIGGERED_NOT_REGISTERED: 0,
  TRIGGERED_100: 1,
  OVERDUE_FILING: 2,
  URGENT_90: 3,
  WARNING_70: 4,
};

function toPrismaBand(band: NexusAlert["band"]): PrismaNexusBand {
  return band;
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export class NexusService extends BaseService {
  constructor(ctx: BaseServiceContext) {
    super(ctx);
  }

  static async create(clerkUserId: string): Promise<NexusService> {
    const tenant = await getTenantContext(clerkUserId);
    return new NexusService({
      firmId: tenant.firmId,
      userId: tenant.userId,
      billingTier: tenant.billingTier,
    });
  }

  async calculateEntityNexus(entityId: string): Promise<{ results: NexusResult[]; alerts: Alert[] }> {
    const prisma = this.getPrisma();

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, firmId: true },
    });
    if (!entity) {
      throw new ResourceNotFoundError("Entity not found", { entityId });
    }
    this.assertFirmScope(entity);

    const [revenueEntries, stateThresholds, registrations] = await Promise.all([
      prisma.revenueEntry.findMany({
        where: { entityId, firmId: this.firmId },
        select: {
          entityId: true,
          stateCode: true,
          periodYear: true,
          periodMonth: true,
          amount: true,
          transactionCount: true,
        },
      }),
      prisma.stateThreshold.findMany({
        where: { version: 1 },
        select: {
          stateCode: true,
          stateName: true,
          salesThreshold: true,
          transactionThreshold: true,
          measurementPeriod: true,
        },
      }),
      prisma.nexusRegistration.findMany({
        where: { entityId, firmId: this.firmId },
        select: {
          entityId: true,
          stateCode: true,
          status: true,
        },
      }),
    ]);

    const engineOutput = calculateNexus({
      entityId,
      firmId: this.firmId,
      revenueEntries: revenueEntries.map((entry) => ({
        ...entry,
        amount: Number(entry.amount),
      })),
      stateThresholds: stateThresholds.map((threshold) => ({
        ...threshold,
        salesThreshold: isDefined(threshold.salesThreshold) ? Number(threshold.salesThreshold) : null,
      })),
      registrations,
      asOfDate: new Date(),
    });

    // Keep a MONITORING registration row per evaluated state unless state is already REGISTERED.
    for (const result of engineOutput.results) {
      const existing = registrations.find((r) => r.stateCode === result.stateCode);
      if (existing?.status === "REGISTERED") {
        continue;
      }

      await prisma.nexusRegistration.upsert({
        where: {
          entityId_stateCode: {
            entityId,
            stateCode: result.stateCode,
          },
        },
        create: {
          entityId,
          firmId: this.firmId,
          stateCode: result.stateCode,
          status: "MONITORING",
          notes: `Band=${result.band}; controllingPercent=${result.controllingPercent}`,
        },
        update: {
          status: "MONITORING",
          notes: `Band=${result.band}; controllingPercent=${result.controllingPercent}`,
        },
      });
    }

    const savedAlerts: Alert[] = [];
    for (const alert of engineOutput.alerts) {
      const existing = await prisma.alert.findFirst({
        where: {
          firmId: this.firmId,
          entityId,
          stateCode: alert.stateCode,
          alertType: alert.alertType,
          band: toPrismaBand(alert.band),
          periodKey: alert.periodKey,
        },
      });

      if (existing) {
        const updated = await prisma.alert.update({
          where: { id: existing.id },
          data: {
            isSnoozed: false,
            snoozedUntil: null,
            snoozedByUserId: null,
          },
        });
        savedAlerts.push(updated);
      } else {
        const created = await prisma.alert.create({
          data: {
            entityId,
            firmId: this.firmId,
            stateCode: alert.stateCode,
            alertType: alert.alertType,
            band: toPrismaBand(alert.band),
            periodKey: alert.periodKey,
            isRead: false,
            isSnoozed: false,
          },
        });
        savedAlerts.push(created);
      }
    }

    await onRevenueEntryChanged(entityId);

    return { results: engineOutput.results, alerts: savedAlerts };
  }

  async getEntityNexusResults(entityId: string): Promise<NexusResult[]> {
    const { results } = await this.calculateEntityNexus(entityId);
    return results;
  }

  async snoozeAlert(
    alertId: string,
    payload: { days?: number; note: string },
  ): Promise<Alert> {
    const note = payload.note?.trim();
    if (!note) {
      throw new ValidationError("Snooze note is required");
    }

    const prisma = this.getPrisma();
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new ResourceNotFoundError("Alert not found", { alertId });
    }
    this.assertFirmScope(alert);

    const days = payload.days ?? 30;
    const snoozedUntil = new Date();
    snoozedUntil.setUTCDate(snoozedUntil.getUTCDate() + days);

    return prisma.alert.update({
      where: { id: alertId },
      data: {
        isSnoozed: true,
        snoozedUntil,
        snoozedByUserId: this.userId,
        snoozeNote: note,
      },
    });
  }

  async unsnoozeAlert(alertId: string): Promise<Alert> {
    const prisma = this.getPrisma();
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    });
    if (!alert) {
      throw new ResourceNotFoundError("Alert not found", { alertId });
    }
    this.assertFirmScope(alert);

    return prisma.alert.update({
      where: { id: alertId },
      data: {
        isSnoozed: false,
        snoozedUntil: null,
        snoozedByUserId: null,
      },
    });
  }

  async getActiveAlerts(firmId: string, filters: AlertFilters = {}): Promise<Alert[]> {
    if (firmId !== this.firmId) {
      throw new TenancyViolationError("firmId must come from tenant context", {
        expectedFirmId: this.firmId,
        providedFirmId: firmId,
      });
    }

    const alerts = await this.getPrisma().alert.findMany({
      where: {
        firmId: this.firmId,
        isSnoozed: false,
        stateCode: filters.stateCode,
        alertType: filters.alertTypes ? { in: filters.alertTypes } : undefined,
        isRead: filters.unreadOnly ? false : undefined,
      },
    });

    return alerts.sort((a, b) => {
      const weightA = ALERT_PRIORITY[a.alertType] ?? Number.MAX_SAFE_INTEGER;
      const weightB = ALERT_PRIORITY[b.alertType] ?? Number.MAX_SAFE_INTEGER;
      if (weightA !== weightB) return weightA - weightB;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }
}
