import type { BillingTier, NexusBand, UserRole } from "@prisma/client";
import { getTenantContext } from "@/lib/services/auth.service";
import { BaseService, type BaseServiceContext } from "@/lib/services/base.service";
import { ForbiddenError, ResourceNotFoundError } from "@/lib/utils/errors";

const BAND_PRIORITY: Record<NexusBand, number> = {
  TRIGGERED: 0,
  URGENT: 1,
  WARNING: 2,
  REGISTERED: 3,
  SAFE: 4,
};

export type ClientListFilters = {
  search?: string;
  nexusBand?: NexusBand | "ALL";
  assignedStaffId?: string | "unassigned";
  page?: number;
  pageSize?: number;
};

export type ClientListRow = {
  clientId: string;
  clientName: string;
  digestEntityId: string | null;
  entitiesCount: number;
  mostUrgentNexusState: { stateCode: string | null; band: NexusBand };
  activeAlertsCount: number;
  nextFilingDue: { date: Date | null; daysUntil: number | null };
  assignedStaff: { id: string; name: string | null; email: string } | null;
  aiNarrativeDigest: string;
};

export type ClientListResult = {
  rows: ClientListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type CreateClientInput = {
  name: string;
  industry?: string | null;
  assignedUserId?: string | null;
  notes?: string | null;
};

type UpdateClientInput = {
  name?: string;
  industry?: string | null;
};

/** Returns first sentence of narrative text. Empty string when none or when text is the legacy upgrade prompt. */
function firstSentence(text: string | null | undefined): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/Pro required|View plans|Upgrade to view/i.test(trimmed)) return "";
  const sentence = trimmed.match(/[^.!?]+[.!?]/)?.[0] ?? trimmed;
  return sentence.trim();
}

function bandFromAlerts(alerts: Array<{ band: NexusBand }>, fallbackRegistered: boolean): NexusBand {
  if (alerts.length === 0) {
    return fallbackRegistered ? "REGISTERED" : "SAFE";
  }
  return alerts
    .map((a) => a.band)
    .sort((a, b) => BAND_PRIORITY[a] - BAND_PRIORITY[b])[0];
}

export class ClientService extends BaseService {
  constructor(ctx: BaseServiceContext) {
    super(ctx);
  }

  static async create(clerkUserId: string): Promise<ClientService> {
    const tenant = await getTenantContext(clerkUserId);
    return new ClientService({
      firmId: tenant.firmId,
      userId: tenant.userId,
      billingTier: tenant.billingTier,
    });
  }

  private async getCurrentUserRole(): Promise<UserRole> {
    const user = await this.getPrisma().user.findUnique({
      where: { id: this.userId },
      select: { role: true },
    });
    return user?.role ?? "FIRM_ADMIN";
  }

  async createClient(input: CreateClientInput) {
    const role = await this.getCurrentUserRole();
    if (role === "READ_ONLY") {
      throw new ForbiddenError("Read-only users cannot create clients");
    }

    return this.getPrisma().client.create({
      data: {
        firmId: this.firmId,
        name: input.name,
        industry: input.industry ?? null,
        assignedUserId: input.assignedUserId ?? null,
        notes: input.notes ?? null,
      },
    });
  }

  async incrementFirmActiveClientCount(): Promise<void> {
    await this.getPrisma().firm.update({
      where: { id: this.firmId },
      data: { activeClientCount: { increment: 1 } },
    });
  }

  async updateClient(clientId: string, input: UpdateClientInput) {
    const role = await this.getCurrentUserRole();
    if (role === "READ_ONLY") {
      throw new ForbiddenError("Read-only users cannot update clients");
    }

    const existing = await this.getPrisma().client.findUnique({
      where: { id: clientId },
      select: { id: true, firmId: true },
    });
    if (!existing) {
      throw new ResourceNotFoundError("Client not found", { clientId });
    }
    this.assertFirmScope(existing);

    return this.getPrisma().client.update({
      where: { id: clientId },
      data: {
        name: input.name,
        industry: input.industry,
      },
    });
  }

  async getClientById(clientId: string) {
    const client = await this.getPrisma().client.findUnique({
      where: { id: clientId },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        aiSummaries: {
          orderBy: { generatedAt: "desc" },
          take: 1,
          select: { summaryText: true, generatedAt: true },
        },
        entities: {
          include: {
            alerts: {
              where: { isSnoozed: false },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { id: true, band: true, stateCode: true, alertType: true, createdAt: true },
            },
            filingRecords: {
              where: { status: { in: ["UPCOMING", "PREPARED", "OVERDUE"] } },
              orderBy: { dueDate: "asc" },
              take: 1,
              select: { id: true, dueDate: true, status: true },
            },
          },
        },
      },
    });
    if (!client) {
      throw new ResourceNotFoundError("Client not found", { clientId });
    }
    this.assertFirmScope(client);

    const role = await this.getCurrentUserRole();
    if (role === "STAFF_ACCOUNTANT" && client.assignedUserId !== this.userId) {
      throw new ForbiddenError("Staff accountants can only access clients assigned to them");
    }

    return client;
  }

  async getClients(filters: ClientListFilters = {}): Promise<ClientListResult> {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);

    const clients = await this.getPrisma().client.findMany({
      where: {
        firmId: this.firmId,
        name: filters.search
          ? { contains: filters.search, mode: "insensitive" }
          : undefined,
      },
      orderBy: { name: "asc" },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        aiSummaries: {
          orderBy: { generatedAt: "desc" },
          take: 1,
          select: { summaryText: true },
        },
        entities: {
          select: {
            id: true,
            name: true,
            alerts: {
              where: { isSnoozed: false },
              select: { stateCode: true, band: true, alertType: true, createdAt: true },
            },
            nexusRegistrations: {
              where: { status: "REGISTERED" },
              select: { stateCode: true },
            },
            filingRecords: {
              where: { status: { in: ["UPCOMING", "PREPARED", "OVERDUE"] } },
              orderBy: { dueDate: "asc" },
              select: {
                dueDate: true,
                assignedUser: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    const mappedRows: ClientListRow[] = clients.map((client) => {
      const allAlerts = client.entities.flatMap((entity) => entity.alerts);
      const hasRegisteredState = client.entities.some(
        (entity) => entity.nexusRegistrations.length > 0,
      );
      const topAlert = allAlerts.sort((a, b) => {
        const bandDiff = BAND_PRIORITY[a.band] - BAND_PRIORITY[b.band];
        if (bandDiff !== 0) return bandDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })[0];

      const nextFiling = client.entities
        .flatMap((entity) => entity.filingRecords)
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

      const daysUntil = nextFiling
        ? Math.ceil((nextFiling.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        clientId: client.id,
        clientName: client.name,
        digestEntityId: client.entities[0]?.id ?? null,
        entitiesCount: client.entities.length,
        mostUrgentNexusState: {
          stateCode: topAlert?.stateCode ?? null,
          band: bandFromAlerts(allAlerts, hasRegisteredState),
        },
        activeAlertsCount: allAlerts.length,
        nextFilingDue: {
          date: nextFiling?.dueDate ?? null,
          daysUntil,
        },
        assignedStaff: client.assignedUser ?? nextFiling?.assignedUser ?? null,
        aiNarrativeDigest: firstSentence(client.aiSummaries[0]?.summaryText),
      };
    });

    const filtered = mappedRows.filter((row) => {
      if (filters.nexusBand && filters.nexusBand !== "ALL") {
        if (row.mostUrgentNexusState.band !== filters.nexusBand) return false;
      }
      if (filters.assignedStaffId) {
        if (filters.assignedStaffId === "unassigned") {
          if (row.assignedStaff) return false;
        } else if (row.assignedStaff?.id !== filters.assignedStaffId) {
          return false;
        }
      }
      return true;
    });

    // Default sort: most urgent first, then active alert count desc.
    const sorted = filtered.sort((a, b) => {
      const bandDiff =
        BAND_PRIORITY[a.mostUrgentNexusState.band] - BAND_PRIORITY[b.mostUrgentNexusState.band];
      if (bandDiff !== 0) return bandDiff;
      if (a.activeAlertsCount !== b.activeAlertsCount) {
        return b.activeAlertsCount - a.activeAlertsCount;
      }
      return a.clientName.localeCompare(b.clientName);
    });

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return {
      rows: paged,
      total,
      page: currentPage,
      pageSize,
      totalPages,
    };
  }
}

export async function createClientServiceFromTenant(tenant: {
  firmId: string;
  userId: string;
  billingTier: BillingTier;
}): Promise<ClientService> {
  return new ClientService(tenant);
}
