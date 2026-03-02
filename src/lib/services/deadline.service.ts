import type {
  Alert,
  FilingRecord,
  FilingStatus,
  FilingStatusHistory,
  NexusBand,
  PublicHoliday,
} from "@prisma/client";
import {
  generateFilingSchedule,
  generateReminderEvents,
  getOverdueFilings,
  transitionFilingStatus,
  type GeneratedFilingRecord,
  type ReminderEvent,
} from "@/lib/engines/deadline.engine";
import { onFilingStatusChanged } from "@/lib/redis/invalidation";
import { getTenantContext } from "@/lib/services/auth.service";
import { BaseService, type BaseServiceContext } from "@/lib/services/base.service";
import {
  ResourceNotFoundError,
  TenancyViolationError,
  ValidationError,
} from "@/lib/utils/errors";

type FilingStatusUpdateInput = {
  status: FilingStatus;
  note: string;
};

export type CalendarFilingFilters = {
  startDate: Date;
  endDate: Date;
  clientId?: string;
  stateCode?: string;
  status?: FilingStatus;
  assignedStaffId?: string;
};

export type CalendarFilingItem = {
  id: string;
  clientId: string;
  clientName: string;
  entityId: string;
  entityName: string;
  stateCode: string;
  periodYear: number;
  periodMonth: number | null;
  periodQuarter: number | null;
  dueDate: Date;
  status: FilingStatus;
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

function periodKeyFromFiling(filing: FilingRecord): string {
  if (filing.periodMonth) {
    return `${filing.periodYear}-${String(filing.periodMonth).padStart(2, "0")}`;
  }
  if (filing.periodQuarter) {
    return `${filing.periodYear}-Q${filing.periodQuarter}`;
  }
  return `${filing.periodYear}`;
}

function toGeneratedRecord(filing: FilingRecord): GeneratedFilingRecord {
  return {
    id: filing.id,
    entityId: filing.entityId,
    firmId: filing.firmId,
    stateCode: filing.stateCode,
    periodYear: filing.periodYear,
    periodMonth: filing.periodMonth,
    periodQuarter: filing.periodQuarter,
    rawDueDate: filing.dueDate,
    adjustedDueDate: filing.dueDate,
    status: filing.status,
  };
}

export class DeadlineService extends BaseService {
  constructor(ctx: BaseServiceContext) {
    super(ctx);
  }

  static async create(clerkUserId: string): Promise<DeadlineService> {
    const tenant = await getTenantContext(clerkUserId);
    return new DeadlineService({
      firmId: tenant.firmId,
      userId: tenant.userId,
      billingTier: tenant.billingTier,
    });
  }

  async generateEntitySchedule(entityId: string): Promise<FilingRecord[]> {
    const prisma = this.getPrisma();
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, firmId: true },
    });
    if (!entity) {
      throw new ResourceNotFoundError("Entity not found", { entityId });
    }
    this.assertFirmScope(entity);

    const [registrations, rules, holidays] = await Promise.all([
      prisma.nexusRegistration.findMany({
        where: {
          entityId,
          firmId: this.firmId,
          status: "REGISTERED",
        },
      }),
      prisma.stateFilingRule.findMany({
        where: { version: 1 },
      }),
      prisma.publicHoliday.findMany(),
    ]);

    const created: FilingRecord[] = [];

    for (const registration of registrations) {
      const rule = rules.find(
        (r) =>
          r.stateCode === registration.stateCode &&
          (!registration.filingFrequency || r.filingFrequency === registration.filingFrequency),
      );
      if (!rule) continue;

      const schedule = generateFilingSchedule({
        nexusRegistration: {
          entityId: registration.entityId,
          firmId: registration.firmId,
          stateCode: registration.stateCode,
          status: registration.status,
          filingFrequency: registration.filingFrequency,
          registrationDate: registration.registrationDate,
        },
        stateFilingRule: {
          stateCode: rule.stateCode,
          filingFrequency: rule.filingFrequency,
          dueDateDaysAfterPeriod: rule.dueDateDaysAfterPeriod,
        },
        publicHolidays: holidays.map((h: PublicHoliday) => ({
          stateCode: h.stateCode,
          date: h.date,
          name: h.name,
          year: h.year,
        })),
        generateMonthsAhead: 12,
        asOfDate: new Date(),
      });

      for (const generated of schedule) {
        const exists = await prisma.filingRecord.findFirst({
          where: {
            entityId: generated.entityId,
            firmId: generated.firmId,
            stateCode: generated.stateCode,
            periodYear: generated.periodYear,
            periodMonth: generated.periodMonth,
            periodQuarter: generated.periodQuarter,
          },
          select: { id: true },
        });
        if (exists) continue;

        const filing = await prisma.filingRecord.create({
          data: {
            entityId: generated.entityId,
            firmId: generated.firmId,
            stateCode: generated.stateCode,
            periodYear: generated.periodYear,
            periodMonth: generated.periodMonth,
            periodQuarter: generated.periodQuarter,
            dueDate: generated.adjustedDueDate,
            status: "UPCOMING",
            assignedUserId: null,
          },
        });
        created.push(filing);
      }
    }

    return created;
  }

  async updateFilingStatus(
    filingRecordId: string,
    payload: FilingStatusUpdateInput,
  ): Promise<{ filing: FilingRecord; history: FilingStatusHistory }> {
    const note = payload.note?.trim();
    if (!note) {
      throw new ValidationError("Status transition note is required");
    }

    const prisma = this.getPrisma();
    const filing = await prisma.filingRecord.findUnique({
      where: { id: filingRecordId },
    });
    if (!filing) {
      throw new ResourceNotFoundError("Filing record not found", { filingRecordId });
    }
    this.assertFirmScope(filing);

    const next = transitionFilingStatus(filing.status, payload.status);

    const updated = await prisma.filingRecord.update({
      where: { id: filing.id },
      data: { status: next },
    });

    const history = await prisma.filingStatusHistory.create({
      data: {
        filingRecordId: filing.id,
        firmId: this.firmId,
        previousStatus: filing.status,
        newStatus: next,
        note,
        changedByUserId: this.userId,
      },
    });

    await onFilingStatusChanged(filing.entityId);

    return { filing: updated, history };
  }

  async detectAndMarkOverdue(): Promise<{ updatedCount: number; alerts: Alert[] }> {
    const prisma = this.getPrisma();
    const candidates = await prisma.filingRecord.findMany({
      where: {
        firmId: this.firmId,
        status: { in: ["UPCOMING", "PREPARED"] },
      },
    });

    const overdue = getOverdueFilings(
      candidates.map(toGeneratedRecord),
      new Date(),
    );

    const alerts: Alert[] = [];
    for (const overdueRecord of overdue) {
      const updated = await prisma.filingRecord.update({
        where: { id: overdueRecord.id },
        data: { status: "OVERDUE" },
      });
      this.assertFirmScope(updated);

      const periodKey = periodKeyFromFiling(updated);
      const band: NexusBand = "URGENT";

      const existing = await prisma.alert.findFirst({
        where: {
          firmId: this.firmId,
          entityId: updated.entityId,
          stateCode: updated.stateCode,
          alertType: "OVERDUE_FILING",
          band,
          periodKey,
        },
      });

      if (existing) {
        alerts.push(existing);
      } else {
        const createdAlert = await prisma.alert.create({
          data: {
            entityId: updated.entityId,
            firmId: this.firmId,
            stateCode: updated.stateCode,
            alertType: "OVERDUE_FILING",
            band,
            periodKey,
            isRead: false,
            isSnoozed: false,
          },
        });
        alerts.push(createdAlert);
      }
    }

    return { updatedCount: overdue.length, alerts };
  }

  async getUpcomingFilings(firmId: string, daysAhead: number): Promise<FilingRecord[]> {
    if (firmId !== this.firmId) {
      throw new TenancyViolationError("firmId must come from tenant context", {
        expectedFirmId: this.firmId,
        providedFirmId: firmId,
      });
    }

    const now = new Date();
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + daysAhead);

    return this.getPrisma().filingRecord.findMany({
      where: {
        firmId: this.firmId,
        dueDate: { gte: now, lte: end },
      },
      orderBy: [{ dueDate: "asc" }],
    });
  }

  async getRemindersDueToday(firmId: string): Promise<ReminderEvent[]> {
    if (firmId !== this.firmId) {
      throw new TenancyViolationError("firmId must come from tenant context", {
        expectedFirmId: this.firmId,
        providedFirmId: firmId,
      });
    }

    const records = await this.getPrisma().filingRecord.findMany({
      where: {
        firmId: this.firmId,
        status: { in: ["UPCOMING", "PREPARED"] },
      },
    });

    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);

    return generateReminderEvents(records.map(toGeneratedRecord)).filter((event) => {
      const reminderDate = new Date(event.dueDate);
      reminderDate.setUTCDate(reminderDate.getUTCDate() - event.daysUntilDue);
      return reminderDate.toISOString().slice(0, 10) === todayKey;
    });
  }

  async getCalendarFilings(filters: CalendarFilingFilters): Promise<CalendarFilingItem[]> {
    const filings = await this.getPrisma().filingRecord.findMany({
      where: {
        firmId: this.firmId,
        dueDate: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
        stateCode: filters.stateCode || undefined,
        status: filters.status || undefined,
        assignedUserId: filters.assignedStaffId || undefined,
        entity: {
          clientId: filters.clientId || undefined,
        },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        stateCode: true,
        periodYear: true,
        periodMonth: true,
        periodQuarter: true,
        dueDate: true,
        status: true,
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
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return filings.map((filing) => ({
      id: filing.id,
      clientId: filing.entity.client.id,
      clientName: filing.entity.client.name,
      entityId: filing.entity.id,
      entityName: filing.entity.name,
      stateCode: filing.stateCode,
      periodYear: filing.periodYear,
      periodMonth: filing.periodMonth,
      periodQuarter: filing.periodQuarter,
      dueDate: filing.dueDate,
      status: filing.status,
      assignedTo: filing.assignedUser,
    }));
  }

  async getWeeklyDigestPreview(): Promise<string[]> {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = (8 - day) % 7;
    const upcomingMonday = new Date(now);
    upcomingMonday.setDate(now.getDate() + mondayOffset);
    upcomingMonday.setHours(0, 0, 0, 0);
    const sunday = new Date(upcomingMonday);
    sunday.setDate(upcomingMonday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weeklyFilings = await this.getCalendarFilings({
      startDate: upcomingMonday,
      endDate: sunday,
    });

    const overdueCount = weeklyFilings.filter((f) => f.status === "OVERDUE").length;
    const dueSoonCount = weeklyFilings.filter(
      (f) => f.status === "UPCOMING" || f.status === "PREPARED",
    ).length;
    const byState = new Map<string, number>();
    for (const filing of weeklyFilings) {
      byState.set(filing.stateCode, (byState.get(filing.stateCode) ?? 0) + 1);
    }

    const topStates = Array.from(byState.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([state, count]) => `${state} (${count})`);

    return [
      `Week of ${upcomingMonday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${weeklyFilings.length} deadlines scheduled.`,
      `${overdueCount} overdue filing${overdueCount === 1 ? "" : "s"} need immediate attention.`,
      `${dueSoonCount} filing${dueSoonCount === 1 ? "" : "s"} are UPCOMING or PREPARED this week.`,
      topStates.length > 0
        ? `Top filing states this week: ${topStates.join(", ")}.`
        : "No state concentration trends for this week.",
    ];
  }
}
