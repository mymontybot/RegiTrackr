import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH as patchClientRoute } from "../app/api/clients/[clientId]/route";
import { PATCH as patchFilingStatusRoute } from "../app/api/filings/[filingId]/status/route";
import { POST as narrativeRoute } from "../app/api/narratives/[entityId]/route";
import { POST as snoozeAlertRoute } from "../app/api/alerts/[alertId]/snooze/route";
import { ClientService } from "../lib/services/client.service";
import { DeadlineService } from "../lib/services/deadline.service";
import { NexusService } from "../lib/services/nexus.service";
import { PortalService } from "../lib/services/portal.service";
import { RevenueService as RevenueServiceForTest } from "../lib/services/revenue.service";
import {
  AuthError,
  ForbiddenError,
  TenancyViolationError,
} from "../lib/utils/errors";

const prismaMock = vi.hoisted(() => ({
  firm: {
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  client: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  entity: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  revenueEntry: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  stateThreshold: {
    findMany: vi.fn(),
  },
  nexusRegistration: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  filingRecord: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  filingStatusHistory: {
    create: vi.fn(),
  },
  alert: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  aiSummary: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  narrativeHistory: {
    create: vi.fn(),
  },
  portalUser: {
    findUnique: vi.fn(),
  },
}));

const authMock = vi.hoisted(() => vi.fn());
const getTenantContextMock = vi.hoisted(() => vi.fn());
const captureExceptionMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/db/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("../lib/services/auth.service", () => ({
  getTenantContext: getTenantContextMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
  captureMessage: vi.fn(),
}));

vi.mock("../lib/redis/invalidation", () => ({
  onRevenueEntryChanged: vi.fn().mockResolvedValue(undefined),
  onFilingStatusChanged: vi.fn().mockResolvedValue(undefined),
  onAlertTriggered: vi.fn().mockResolvedValue(undefined),
  onThresholdDatabaseUpdated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/redis/client", () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(60),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
  },
  narrativeCacheKey: vi.fn((entityId: string, inputHash: string) => `narrative:v1:${entityId}:${inputHash}`),
}));

vi.mock("../lib/ai/narrative-input", () => ({
  buildNarrativeInput: vi.fn(),
}));

vi.mock("../lib/ai/narrative.engine", () => ({
  generateNarrative: vi.fn(),
}));

type Fixtures = ReturnType<typeof buildFixtures>;

function buildFixtures() {
  const firmA = {
    id: "firm-a",
    name: "Firm A CPA",
    slug: "firm-a",
    billingTier: "PRO" as const,
  };
  const firmB = {
    id: "firm-b",
    name: "Firm B CPA",
    slug: "firm-b",
    billingTier: "PRO" as const,
  };

  const users = {
    adminA: {
      id: "user-admin-a",
      clerkUserId: "clerk-admin-a",
      firmId: firmA.id,
      role: "FIRM_ADMIN" as const,
    },
    staffA: {
      id: "user-staff-a",
      clerkUserId: "clerk-staff-a",
      firmId: firmA.id,
      role: "STAFF_ACCOUNTANT" as const,
    },
    readOnlyA: {
      id: "user-readonly-a",
      clerkUserId: "clerk-readonly-a",
      firmId: firmA.id,
      role: "READ_ONLY" as const,
    },
    adminB: {
      id: "user-admin-b",
      clerkUserId: "clerk-admin-b",
      firmId: firmB.id,
      role: "FIRM_ADMIN" as const,
    },
  };

  const clients = {
    clientA: {
      id: "client-a",
      firmId: firmA.id,
      name: "Client A",
      assignedUserId: users.adminA.id,
    },
    clientB: {
      id: "client-b",
      firmId: firmB.id,
      name: "Client B",
      assignedUserId: users.adminB.id,
    },
  };

  const entities = {
    entityA: {
      id: "entity-a",
      clientId: clients.clientA.id,
      firmId: firmA.id,
      name: "Entity A LLC",
    },
    entityB: {
      id: "entity-b",
      clientId: clients.clientB.id,
      firmId: firmB.id,
      name: "Entity B LLC",
    },
  };

  const revenueEntries = {
    entryA: {
      id: "rev-a",
      entityId: entities.entityA.id,
      firmId: firmA.id,
      stateCode: "CA",
    },
    entryB: {
      id: "rev-b",
      entityId: entities.entityB.id,
      firmId: firmB.id,
      stateCode: "NY",
    },
  };

  const nexusRegistrations = {
    regA: {
      id: "nexus-a",
      entityId: entities.entityA.id,
      firmId: firmA.id,
      stateCode: "CA",
      status: "MONITORING" as const,
    },
    regB: {
      id: "nexus-b",
      entityId: entities.entityB.id,
      firmId: firmB.id,
      stateCode: "NY",
      status: "MONITORING" as const,
    },
  };

  const filings = {
    filingA: {
      id: "filing-a",
      entityId: entities.entityA.id,
      firmId: firmA.id,
      stateCode: "CA",
      periodYear: 2026,
      periodMonth: 1,
      periodQuarter: null,
      dueDate: new Date("2026-02-20T00:00:00.000Z"),
      status: "UPCOMING" as const,
    },
    filingB: {
      id: "filing-b",
      entityId: entities.entityB.id,
      firmId: firmB.id,
      stateCode: "NY",
      periodYear: 2026,
      periodMonth: 1,
      periodQuarter: null,
      dueDate: new Date("2026-02-20T00:00:00.000Z"),
      status: "UPCOMING" as const,
    },
  };

  const alerts = {
    alertA: {
      id: "alert-a",
      entityId: entities.entityA.id,
      firmId: firmA.id,
      stateCode: "CA",
      alertType: "WARNING_70" as const,
      band: "WARNING" as const,
      periodKey: "2026-01",
      isSnoozed: false,
      isRead: false,
      createdAt: new Date("2026-01-15T00:00:00.000Z"),
    },
    alertB: {
      id: "alert-b",
      entityId: entities.entityB.id,
      firmId: firmB.id,
      stateCode: "NY",
      alertType: "WARNING_70" as const,
      band: "WARNING" as const,
      periodKey: "2026-01",
      isSnoozed: false,
      isRead: false,
      createdAt: new Date("2026-01-15T00:00:00.000Z"),
    },
  };

  const aiSummaries = {
    summaryA: {
      id: "summary-a",
      firmId: firmA.id,
      entityId: entities.entityA.id,
      summaryType: "NEXUS_EXPOSURE_NARRATIVE",
    },
    summaryB: {
      id: "summary-b",
      firmId: firmB.id,
      entityId: entities.entityB.id,
      summaryType: "NEXUS_EXPOSURE_NARRATIVE",
    },
  };

  const portalUsers = {
    portalA: {
      id: "portal-a",
      firmId: firmA.id,
      clientId: clients.clientA.id,
      email: "portal-a@example.com",
      canSubmitRevenue: true,
    },
    portalOtherClientSameFirm: {
      id: "portal-a-other",
      firmId: firmA.id,
      clientId: "client-a-other",
      email: "portal-other@example.com",
      canSubmitRevenue: true,
    },
  };

  return {
    firms: { firmA, firmB },
    users,
    clients,
    entities,
    revenueEntries,
    nexusRegistrations,
    filings,
    alerts,
    aiSummaries,
    portalUsers,
  };
}

function tenantForUser(fixtures: Fixtures, user: keyof Fixtures["users"]) {
  const selected = fixtures.users[user];
  return {
    firmId: selected.firmId,
    userId: selected.id,
    role: selected.role,
    billingTier: "PRO" as const,
  };
}

describe("tenancy isolation suite", () => {
  let fixtures: Fixtures;

  beforeEach(() => {
    vi.clearAllMocks();
    fixtures = buildFixtures();

    authMock.mockResolvedValue({ userId: fixtures.users.adminA.clerkUserId });
    getTenantContextMock.mockResolvedValue(tenantForUser(fixtures, "adminA"));

    prismaMock.user.findUnique.mockImplementation(async (args: { where: { id?: string; clerkUserId?: string } }) => {
      const id = args?.where?.id;
      const clerkUserId = args?.where?.clerkUserId;
      const allUsers = Object.values(fixtures.users);
      const byId = id ? allUsers.find((u) => u.id === id) : null;
      const byClerkId = clerkUserId ? allUsers.find((u) => u.clerkUserId === clerkUserId) : null;
      const selected = byId ?? byClerkId;
      if (!selected) return null;

      return {
        id: selected.id,
        clerkUserId: selected.clerkUserId,
        firmId: selected.firmId,
        role: selected.role,
        firm: {
          billingTier: "PRO" as const,
        },
      };
    });
  });

  it("1) Firm A cannot GET Firm B's clients (403, not 404)", async () => {
    prismaMock.client.findUnique.mockResolvedValue({
      ...fixtures.clients.clientB,
      entities: [],
      aiSummaries: [],
      assignedUser: null,
    });

    const service = new ClientService({
      firmId: fixtures.firms.firmA.id,
      userId: fixtures.users.adminA.id,
      billingTier: "PRO",
    });

    await expect(service.getClientById(fixtures.clients.clientB.id)).rejects.toMatchObject({
      name: "TenancyViolationError",
      statusCode: 403,
    });
  });

  it("2) Firm A cannot GET Firm B's entities", async () => {
    prismaMock.entity.findUnique.mockResolvedValue({
      id: fixtures.entities.entityB.id,
      firmId: fixtures.firms.firmB.id,
    });

    const service = new NexusService({
      firmId: fixtures.firms.firmA.id,
      userId: fixtures.users.adminA.id,
      billingTier: "PRO",
    });

    await expect(service.calculateEntityNexus(fixtures.entities.entityB.id)).rejects.toMatchObject({
      name: "TenancyViolationError",
      statusCode: 403,
    });
  });

  it("3) Firm A cannot GET Firm B's revenue entries", async () => {
    prismaMock.entity.findUnique.mockResolvedValue({
      id: fixtures.entities.entityB.id,
      firmId: fixtures.firms.firmB.id,
    });

    const service = new RevenueServiceForTest({
      firmId: fixtures.firms.firmA.id,
      userId: fixtures.users.adminA.id,
      billingTier: "PRO",
    });

    await expect(service.getEntriesByEntity(fixtures.entities.entityB.id)).rejects.toMatchObject({
      name: "TenancyViolationError",
      statusCode: 403,
    });
  });

  it("4) Firm A cannot GET Firm B's nexus results", async () => {
    prismaMock.entity.findUnique.mockResolvedValue({
      id: fixtures.entities.entityB.id,
      firmId: fixtures.firms.firmB.id,
    });

    const service = new NexusService({
      firmId: fixtures.firms.firmA.id,
      userId: fixtures.users.adminA.id,
      billingTier: "PRO",
    });

    await expect(service.getEntityNexusResults(fixtures.entities.entityB.id)).rejects.toMatchObject({
      name: "TenancyViolationError",
      statusCode: 403,
    });
  });

  it("5) Firm A cannot GET/operate on Firm B's filing records", async () => {
    prismaMock.filingRecord.findUnique.mockResolvedValue(fixtures.filings.filingB);

    const service = new DeadlineService({
      firmId: fixtures.firms.firmA.id,
      userId: fixtures.users.adminA.id,
      billingTier: "PRO",
    });

    await expect(
      service.updateFilingStatus(fixtures.filings.filingB.id, { status: "FILED", note: "Test note" }),
    ).rejects.toMatchObject({
      name: "TenancyViolationError",
      statusCode: 403,
    });
  });

  it("6) Firm A cannot GET Firm B's AI summaries via narrative endpoint", async () => {
    prismaMock.entity.findUnique.mockResolvedValue({
      id: fixtures.entities.entityB.id,
      firmId: fixtures.firms.firmB.id,
    });

    const response = await narrativeRoute(
      new Request("http://localhost/api/narratives/entity-b", { method: "POST", body: "{}" }),
      { params: Promise.resolve({ entityId: fixtures.entities.entityB.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ success: false });
  });

  it("7) Firm A cannot PATCH Firm B's filing status", async () => {
    prismaMock.filingRecord.findUnique.mockResolvedValue(fixtures.filings.filingB);

    const response = await patchFilingStatusRoute(
      new Request("http://localhost/api/filings/filing-b/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FILED", note: "Cross-tenant attempt" }),
      }),
      { params: Promise.resolve({ filingId: fixtures.filings.filingB.id }) },
    );

    expect(response.status).toBe(403);
  });

  it("8) Firm A cannot snooze Firm B's alerts", async () => {
    prismaMock.alert.findUnique.mockResolvedValue(fixtures.alerts.alertB);

    const response = await snoozeAlertRoute(
      new Request("http://localhost/api/alerts/alert-b/snooze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Cross-tenant snooze", days: 14 }),
      }),
      { params: Promise.resolve({ alertId: fixtures.alerts.alertB.id }) },
    );

    expect(response.status).toBe(403);
  });

  it("9) firmId in request body is ignored; session tenant controls write scope", async () => {
    prismaMock.client.findUnique.mockResolvedValue({
      id: fixtures.clients.clientA.id,
      firmId: fixtures.firms.firmA.id,
    });
    prismaMock.client.update.mockResolvedValue({
      ...fixtures.clients.clientA,
      name: "Renamed Client A",
      industry: "Retail",
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    });

    const response = await patchClientRoute(
      new Request("http://localhost/api/clients/client-a", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Renamed Client A",
          industry: "Retail",
          firmId: fixtures.firms.firmB.id,
        }),
      }),
      { params: Promise.resolve({ clientId: fixtures.clients.clientA.id }) },
    );

    expect(response.status).toBe(200);
    expect(prismaMock.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: fixtures.clients.clientA.id },
        data: expect.not.objectContaining({
          firmId: expect.anything(),
        }),
      }),
    );
  });

  it("10) Staff Accountant cannot access clients not assigned to them", async () => {
    prismaMock.client.findUnique.mockResolvedValue({
      ...fixtures.clients.clientA,
      assignedUserId: fixtures.users.adminA.id,
      assignedUser: null,
      entities: [],
      aiSummaries: [],
    });

    const service = new ClientService({
      firmId: fixtures.firms.firmA.id,
      userId: fixtures.users.staffA.id,
      billingTier: "PRO",
    });

    await expect(service.getClientById(fixtures.clients.clientA.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("11) Read-Only role cannot edit data (write endpoints return 403)", async () => {
    getTenantContextMock.mockResolvedValue(tenantForUser(fixtures, "readOnlyA"));

    prismaMock.client.findUnique.mockResolvedValue({
      id: fixtures.clients.clientA.id,
      firmId: fixtures.firms.firmA.id,
    });
    prismaMock.client.update.mockResolvedValue({
      ...fixtures.clients.clientA,
      name: "ReadOnly Update Attempt",
      industry: null,
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    });

    const clientResponse = await patchClientRoute(
      new Request("http://localhost/api/clients/client-a", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "ReadOnly Update Attempt" }),
      }),
      { params: Promise.resolve({ clientId: fixtures.clients.clientA.id }) },
    );

    expect(clientResponse.status).toBe(403);
  });

  it("12) Portal user cannot access another client's data (same firm)", async () => {
    prismaMock.portalUser.findUnique.mockResolvedValue({
      id: fixtures.portalUsers.portalA.id,
      email: fixtures.portalUsers.portalA.email,
      canSubmitRevenue: true,
      clientId: fixtures.portalUsers.portalOtherClientSameFirm.clientId,
      firmId: fixtures.firms.firmA.id,
      client: { id: fixtures.portalUsers.portalOtherClientSameFirm.clientId, name: "Other Client" },
      firm: {
        id: fixtures.firms.firmA.id,
        name: fixtures.firms.firmA.name,
        slug: fixtures.firms.firmA.slug,
        logoUrl: null,
        supportEmail: null,
      },
    });

    const service = PortalService.create({
      portalUserId: fixtures.portalUsers.portalA.id,
      firmId: fixtures.firms.firmA.id,
      clientId: fixtures.clients.clientA.id,
      firmSlug: fixtures.firms.firmA.slug,
    });

    await expect(service.getPortalShellData()).rejects.toBeInstanceOf(AuthError);
  });

  it("13) TenancyViolationError is logged to Sentry when triggered", async () => {
    prismaMock.client.findUnique.mockResolvedValue({
      ...fixtures.clients.clientB,
      assignedUser: null,
      entities: [],
      aiSummaries: [],
    });

    const service = new ClientService({
      firmId: fixtures.firms.firmA.id,
      userId: fixtures.users.adminA.id,
      billingTier: "PRO",
    });

    await expect(service.getClientById(fixtures.clients.clientB.id)).rejects.toBeInstanceOf(
      TenancyViolationError,
    );
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "TenancyViolationError" }),
      expect.objectContaining({
        level: "fatal",
        tags: { errorType: "tenancy_violation" },
      }),
    );
  });
});

