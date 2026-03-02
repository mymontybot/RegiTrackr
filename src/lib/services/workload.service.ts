import type { BillingTier, UserRole } from "@prisma/client";
import { getTenantContext } from "@/lib/services/auth.service";
import { BaseService, type BaseServiceContext } from "@/lib/services/base.service";
import { TenancyViolationError } from "@/lib/utils/errors";

export type StaffWorkloadSummary = {
  userId: string;
  userName: string;
  userEmail: string;
  role: UserRole;
  assignedClientCount: number;
  assignedEntityCount: number;
  deadlinesThisMonth: number;
  overdueCount: number;
  preparedCount: number;
  activeAlertCount: number;
  urgentAlertCount: number;
  nextDeadline: Date | null;
  workloadScore: number;
};

export type WorkloadOverview = {
  staff: StaffWorkloadSummary[];
  unassignedClientCount: number;
  unassignedEntityCount: number;
  totalStaff: number;
  totalDeadlinesThisMonth: number;
  totalOverdue: number;
  totalActiveAlerts: number;
};

type MutableStaffStats = {
  info: StaffWorkloadSummary;
};

export class WorkloadService extends BaseService {
  constructor(ctx: BaseServiceContext) {
    super(ctx);
  }

  static async create(clerkUserId: string): Promise<WorkloadService> {
    const tenant = await getTenantContext(clerkUserId);
    return new WorkloadService({
      firmId: tenant.firmId,
      userId: tenant.userId,
      billingTier: tenant.billingTier,
    });
  }

  async getStaffWorkload(firmId: string): Promise<WorkloadOverview> {
    if (firmId !== this.firmId) {
      throw new TenancyViolationError("firmId must come from tenant context", {
        expectedFirmId: this.firmId,
        providedFirmId: firmId,
      });
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setMilliseconds(-1);
    const now = new Date();

    const [users, clients, deadlinesByUser, overdueByUser, preparedByUser, nextDeadlineByUser, entities, alerts] = await Promise.all([
      this.getPrisma().user.findMany({
        where: { firmId: this.firmId },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        select: { id: true, name: true, email: true, role: true },
      }),
      this.getPrisma().client.findMany({
        where: { firmId: this.firmId },
        select: { id: true, assignedUserId: true },
      }),
      this.getPrisma().filingRecord.groupBy({
        by: ["assignedUserId"],
        where: {
          firmId: this.firmId,
          assignedUserId: { not: null },
          dueDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _count: { _all: true },
      }),
      this.getPrisma().filingRecord.groupBy({
        by: ["assignedUserId"],
        where: {
          firmId: this.firmId,
          assignedUserId: { not: null },
          status: "OVERDUE",
        },
        _count: { _all: true },
      }),
      this.getPrisma().filingRecord.groupBy({
        by: ["assignedUserId"],
        where: {
          firmId: this.firmId,
          assignedUserId: { not: null },
          status: "PREPARED",
        },
        _count: { _all: true },
      }),
      this.getPrisma().filingRecord.groupBy({
        by: ["assignedUserId"],
        where: {
          firmId: this.firmId,
          assignedUserId: { not: null },
          dueDate: { gte: now },
          status: { in: ["UPCOMING", "PREPARED"] },
        },
        _min: { dueDate: true },
      }),
      this.getPrisma().entity.findMany({
        where: { firmId: this.firmId },
        select: { id: true, client: { select: { assignedUserId: true } } },
      }),
      this.getPrisma().alert.findMany({
        where: {
          firmId: this.firmId,
          isSnoozed: false,
          entity: {
            client: {
              assignedUserId: { not: null },
            },
          },
        },
        select: {
          alertType: true,
          entity: {
            select: {
              client: { select: { assignedUserId: true } },
            },
          },
        },
      }),
    ]);

    const stats = new Map<string, MutableStaffStats>();
    for (const user of users) {
      stats.set(user.id, {
        info: {
          userId: user.id,
          userName: user.name ?? user.email,
          userEmail: user.email,
          role: user.role,
          assignedClientCount: 0,
          assignedEntityCount: 0,
          deadlinesThisMonth: 0,
          overdueCount: 0,
          preparedCount: 0,
          activeAlertCount: 0,
          urgentAlertCount: 0,
          nextDeadline: null,
          workloadScore: 0,
        },
      });
    }

    const deadlinesMap = new Map<string, number>();
    for (const row of deadlinesByUser) {
      if (!row.assignedUserId) continue;
      deadlinesMap.set(row.assignedUserId, row._count._all);
    }
    const overdueMap = new Map<string, number>();
    for (const row of overdueByUser) {
      if (!row.assignedUserId) continue;
      overdueMap.set(row.assignedUserId, row._count._all);
    }
    const preparedMap = new Map<string, number>();
    for (const row of preparedByUser) {
      if (!row.assignedUserId) continue;
      preparedMap.set(row.assignedUserId, row._count._all);
    }
    const nextDeadlineMap = new Map<string, Date | null>();
    for (const row of nextDeadlineByUser) {
      if (!row.assignedUserId) continue;
      nextDeadlineMap.set(row.assignedUserId, row._min.dueDate ?? null);
    }

    for (const client of clients) {
      if (!client.assignedUserId) continue;
      const entry = stats.get(client.assignedUserId);
      if (!entry) continue;
      entry.info.assignedClientCount += 1;
    }

    for (const entity of entities) {
      const ownerId = entity.client.assignedUserId;
      if (!ownerId) continue;
      const entry = stats.get(ownerId);
      if (!entry) continue;
      entry.info.assignedEntityCount += 1;
    }

    for (const alert of alerts) {
      const ownerId = alert.entity.client.assignedUserId;
      if (!ownerId) continue;
      const entry = stats.get(ownerId);
      if (!entry) continue;
      entry.info.activeAlertCount += 1;
      if (alert.alertType === "URGENT_90" || alert.alertType === "TRIGGERED_100") {
        entry.info.urgentAlertCount += 1;
      }
    }

    for (const entry of stats.values()) {
      entry.info.deadlinesThisMonth = deadlinesMap.get(entry.info.userId) ?? 0;
      entry.info.overdueCount = overdueMap.get(entry.info.userId) ?? 0;
      entry.info.preparedCount = preparedMap.get(entry.info.userId) ?? 0;
      entry.info.nextDeadline = nextDeadlineMap.get(entry.info.userId) ?? null;
      entry.info.workloadScore =
        entry.info.overdueCount * 3 +
        entry.info.urgentAlertCount * 2 +
        entry.info.deadlinesThisMonth;
    }

    const unassignedClients = clients.filter((client) => !client.assignedUserId);
    const unassignedClientIds = new Set(unassignedClients.map((c) => c.id));
    const unassignedEntityCount = await this.getPrisma().entity.count({
      where: {
        firmId: this.firmId,
        clientId: { in: Array.from(unassignedClientIds) },
      },
    });

    const staff = Array.from(stats.values())
      .map((s) => s.info)
      .sort((a, b) => {
        if (a.workloadScore !== b.workloadScore) return b.workloadScore - a.workloadScore;
        return a.userName.localeCompare(b.userName);
      });

    return {
      staff,
      unassignedClientCount: unassignedClients.length,
      unassignedEntityCount,
      totalStaff: staff.length,
      totalDeadlinesThisMonth: staff.reduce((sum, row) => sum + row.deadlinesThisMonth, 0),
      totalOverdue: staff.reduce((sum, row) => sum + row.overdueCount, 0),
      totalActiveAlerts: staff.reduce((sum, row) => sum + row.activeAlertCount, 0),
    };
  }
}

export async function createWorkloadServiceFromTenant(tenant: {
  firmId: string;
  userId: string;
  billingTier: BillingTier;
}): Promise<WorkloadService> {
  return new WorkloadService(tenant);
}
