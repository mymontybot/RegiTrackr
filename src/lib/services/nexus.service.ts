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

export type AlertCenterTab = "active" | "snoozed";
export type AlertCenterSort = "newest" | "most_urgent";

export type AlertCenterFilters = {
  tab?: AlertCenterTab;
  alertType?: AlertType;
  clientId?: string;
  stateCode?: string;
  urgency?: PrismaNexusBand;
  sort?: AlertCenterSort;
};

export type AlertCenterItem = {
  id: string;
  clientId: string;
  clientName: string;
  entityId: string;
  entityName: string;
  stateCode: string;
  alertType: AlertType;
  band: PrismaNexusBand;
  createdAt: Date;
  isRead: boolean;
  isSnoozed: boolean;
  snoozedUntil: Date | null;
  snoozeNote: string | null;
  snoozedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  lastEmailSentAt: Date | null;
};

const ALERT_PRIORITY: Record<AlertType, number> = {
  TRIGGERED_NOT_REGISTERED: 0,
  TRIGGERED_100: 1,
  OVERDUE_FILING: 2,
  URGENT_90: 3,
  WARNING_70: 4,
};

const BAND_PRIORITY: Record<PrismaNexusBand, number> = {
  TRIGGERED: 0,
  URGENT: 1,
  WARNING: 2,
  REGISTERED: 3,
  SAFE: 4,
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

  async markAlertRead(alertId: string): Promise<Alert> {
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
      data: { isRead: true },
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

  async getAlertsForCenter(filters: AlertCenterFilters = {}): Promise<AlertCenterItem[]> {
    const tab = filters.tab ?? "active";
    const sort = filters.sort ?? "most_urgent";

    const alerts = await this.getPrisma().alert.findMany({
      where: {
        firmId: this.firmId,
        isSnoozed: tab === "snoozed",
        alertType: filters.alertType,
        stateCode: filters.stateCode,
        band: filters.urgency,
        entity: {
          clientId: filters.clientId,
        },
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        snoozedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const mapped: AlertCenterItem[] = alerts.map((alert) => ({
      id: alert.id,
      clientId: alert.entity.client.id,
      clientName: alert.entity.client.name,
      entityId: alert.entity.id,
      entityName: alert.entity.name,
      stateCode: alert.stateCode,
      alertType: alert.alertType,
      band: alert.band,
      createdAt: alert.createdAt,
      isRead: alert.isRead,
      isSnoozed: alert.isSnoozed,
      snoozedUntil: alert.snoozedUntil,
      snoozeNote: alert.snoozeNote,
      snoozedBy: alert.snoozedByUser,
      // Current schema has no outbound-email log table; use alert creation as initial send timestamp.
      lastEmailSentAt: alert.createdAt,
    }));

    if (sort === "newest") {
      return mapped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return mapped.sort((a, b) => {
      const bandDiff = BAND_PRIORITY[a.band] - BAND_PRIORITY[b.band];
      if (bandDiff !== 0) return bandDiff;
      const alertTypeDiff = ALERT_PRIORITY[a.alertType] - ALERT_PRIORITY[b.alertType];
      if (alertTypeDiff !== 0) return alertTypeDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async bulkSnoozeAlerts(payload: {
    alertIds: string[];
    note: string;
    days?: number;
  }): Promise<{ updatedCount: number; snoozedUntil: Date }> {
    const note = payload.note?.trim();
    if (!note) {
      throw new ValidationError("Snooze note is required");
    }
    if (!payload.alertIds.length) {
      throw new ValidationError("At least one alert is required");
    }

    const alerts = await this.getPrisma().alert.findMany({
      where: { id: { in: payload.alertIds } },
      select: { firmId: true },
    });
    for (const alert of alerts) {
      this.assertFirmScope(alert);
    }

    const days = payload.days ?? 30;
    const snoozedUntil = new Date();
    snoozedUntil.setUTCDate(snoozedUntil.getUTCDate() + days);

    const result = await this.getPrisma().alert.updateMany({
      where: {
        id: { in: payload.alertIds },
        firmId: this.firmId,
      },
      data: {
        isSnoozed: true,
        snoozedUntil,
        snoozedByUserId: this.userId,
        snoozeNote: note,
      },
    });

    return { updatedCount: result.count, snoozedUntil };
  }
}
