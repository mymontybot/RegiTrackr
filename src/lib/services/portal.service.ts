import { Resend } from "resend";
import type { FilingStatus, NexusBand, NexusRegistrationStatus } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { decrypt, maskAccountNumber } from "@/lib/encryption/field-encryption";
import type { PortalSession } from "@/lib/services/portal-auth.service";
import { AuthError, ValidationError } from "@/lib/utils/errors";

const BAND_PRIORITY: Record<NexusBand, number> = {
  TRIGGERED: 0,
  URGENT: 1,
  WARNING: 2,
  REGISTERED: 3,
  SAFE: 4,
};

export type PortalNexusRow = {
  stateCode: string;
  revenueYtd: number;
  thresholdPercent: number;
  band: NexusBand;
  registrationStatus: NexusRegistrationStatus | "UNREGISTERED";
};

export type PortalDeadlineRow = {
  id: string;
  stateCode: string;
  periodLabel: string;
  dueDate: Date;
  daysUntilDue: number;
  status: FilingStatus;
};

export type PortalAlertRow = {
  id: string;
  stateCode: string;
  alertType: string;
  band: NexusBand;
  createdAt: Date;
};

export type PortalRegistrationRow = {
  id: string;
  stateCode: string;
  registrationDate: Date | null;
  filingFrequency: string | null;
  maskedAccountNumber: string;
  status: NexusRegistrationStatus;
};

type RevenueSubmissionInput = {
  stateCode: string;
  periodYear: number;
  periodMonth: number;
  revenueAmount: number;
};

function firstDayUtcOfYear(year: number): Date {
  return new Date(Date.UTC(year, 0, 1));
}

function periodLabel(periodYear: number, periodMonth: number | null, periodQuarter: number | null): string {
  if (periodQuarter) return `${periodYear} Q${periodQuarter}`;
  if (periodMonth) return `${periodYear}-${String(periodMonth).padStart(2, "0")}`;
  return String(periodYear);
}

export class PortalService {
  private readonly session: PortalSession;

  constructor(session: PortalSession) {
    this.session = session;
  }

  static create(session: PortalSession): PortalService {
    return new PortalService(session);
  }

  private assertClientScope<T extends { clientId: string; firmId: string }>(record: T): void {
    if (record.clientId !== this.session.clientId || record.firmId !== this.session.firmId) {
      throw new AuthError("Portal access denied");
    }
  }

  async getPortalShellData(): Promise<{
    firm: { id: string; name: string; slug: string; logoUrl: string | null; supportEmail: string | null };
    portalUser: { id: string; email: string; canSubmitRevenue: boolean };
    client: { id: string; name: string };
  }> {
    const portalUser = await prisma.portalUser.findUnique({
      where: { id: this.session.portalUserId },
      select: {
        id: true,
        email: true,
        canSubmitRevenue: true,
        clientId: true,
        firmId: true,
        client: { select: { id: true, name: true } },
        firm: { select: { id: true, name: true, slug: true, logoUrl: true, supportEmail: true } },
      },
    });
    if (!portalUser?.client || !portalUser.firm) {
      throw new AuthError("Portal access denied");
    }
    this.assertClientScope({ clientId: portalUser.clientId, firmId: portalUser.firmId });

    return {
      firm: portalUser.firm,
      portalUser: {
        id: portalUser.id,
        email: portalUser.email,
        canSubmitRevenue: portalUser.canSubmitRevenue,
      },
      client: portalUser.client,
    };
  }

  async getNexusStatusTable(): Promise<PortalNexusRow[]> {
    const currentYear = new Date().getUTCFullYear();
    const [entities, thresholds, registrations] = await Promise.all([
      prisma.entity.findMany({
        where: { firmId: this.session.firmId, clientId: this.session.clientId },
        select: { id: true },
      }),
      prisma.stateThreshold.findMany({
        where: { version: 1 },
        select: { stateCode: true, salesThreshold: true },
      }),
      prisma.nexusRegistration.findMany({
        where: { firmId: this.session.firmId, entity: { clientId: this.session.clientId } },
        select: { stateCode: true, status: true },
      }),
    ]);

    const entityIds = entities.map((e) => e.id);
    if (entityIds.length === 0) return [];

    const revenues = await prisma.revenueEntry.findMany({
      where: {
        firmId: this.session.firmId,
        entityId: { in: entityIds },
        periodYear: currentYear,
      },
      select: { stateCode: true, amount: true },
    });

    const revenueByState = new Map<string, number>();
    for (const rev of revenues) {
      revenueByState.set(rev.stateCode, (revenueByState.get(rev.stateCode) ?? 0) + Number(rev.amount));
    }

    const registrationByState = new Map<string, NexusRegistrationStatus>();
    for (const reg of registrations) {
      if (!registrationByState.has(reg.stateCode) || reg.status === "REGISTERED") {
        registrationByState.set(reg.stateCode, reg.status);
      }
    }

    const rows = thresholds
      .map<PortalNexusRow>((threshold) => {
        const revenueYtd = revenueByState.get(threshold.stateCode) ?? 0;
        const salesThreshold = Number(threshold.salesThreshold);
        const thresholdPercent = salesThreshold > 0 ? (revenueYtd / salesThreshold) * 100 : 0;
        const registrationStatus: PortalNexusRow["registrationStatus"] =
          registrationByState.get(threshold.stateCode) ?? "UNREGISTERED";

        let band: NexusBand = "SAFE";
        if (registrationStatus === "REGISTERED") {
          band = "REGISTERED";
        } else if (thresholdPercent >= 100) {
          band = "TRIGGERED";
        } else if (thresholdPercent >= 90) {
          band = "URGENT";
        } else if (thresholdPercent >= 70) {
          band = "WARNING";
        }

        return {
          stateCode: threshold.stateCode,
          revenueYtd,
          thresholdPercent,
          band,
          registrationStatus,
        };
      })
      .filter((row) => row.revenueYtd > 0 || row.registrationStatus !== "UNREGISTERED")
      .sort((a, b) => {
        const bandDiff = BAND_PRIORITY[a.band] - BAND_PRIORITY[b.band];
        if (bandDiff !== 0) return bandDiff;
        return b.thresholdPercent - a.thresholdPercent;
      });

    return rows;
  }

  async getUpcomingDeadlines(limit = 3): Promise<PortalDeadlineRow[]> {
    const filings = await prisma.filingRecord.findMany({
      where: {
        firmId: this.session.firmId,
        entity: { clientId: this.session.clientId },
      },
      orderBy: [{ dueDate: "asc" }],
      take: 50,
      select: {
        id: true,
        stateCode: true,
        periodYear: true,
        periodMonth: true,
        periodQuarter: true,
        dueDate: true,
        status: true,
      },
    });

    const now = new Date();
    return filings
      .filter((f) => f.status !== "CONFIRMED")
      .slice(0, limit)
      .map((f) => ({
        id: f.id,
        stateCode: f.stateCode,
        periodLabel: periodLabel(f.periodYear, f.periodMonth, f.periodQuarter),
        dueDate: f.dueDate,
        daysUntilDue: Math.ceil((f.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        status: f.status,
      }));
  }

  async getActiveThresholdAlerts(): Promise<PortalAlertRow[]> {
    const alerts = await prisma.alert.findMany({
      where: {
        firmId: this.session.firmId,
        isSnoozed: false,
        alertType: { in: ["WARNING_70", "URGENT_90", "TRIGGERED_100", "TRIGGERED_NOT_REGISTERED"] },
        entity: { clientId: this.session.clientId },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        stateCode: true,
        alertType: true,
        band: true,
        createdAt: true,
      },
    });

    return alerts;
  }

  async getRegistrationTable(): Promise<PortalRegistrationRow[]> {
    const rows = await prisma.nexusRegistration.findMany({
      where: {
        firmId: this.session.firmId,
        entity: { clientId: this.session.clientId },
      },
      orderBy: [{ stateCode: "asc" }],
      select: {
        id: true,
        stateCode: true,
        registrationDate: true,
        filingFrequency: true,
        stateAccountNumber: true,
        status: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      stateCode: row.stateCode,
      registrationDate: row.registrationDate,
      filingFrequency: row.filingFrequency,
      maskedAccountNumber: row.stateAccountNumber
        ? maskAccountNumber(decrypt(row.stateAccountNumber))
        : "-",
      status: row.status,
    }));
  }

  async submitRevenue(input: RevenueSubmissionInput): Promise<{ id: string }> {
    if (input.periodMonth < 1 || input.periodMonth > 12) {
      throw new ValidationError("periodMonth must be between 1 and 12");
    }
    if (input.periodYear < 2000 || input.periodYear > 2100) {
      throw new ValidationError("periodYear must be valid");
    }
    if (input.revenueAmount < 0) {
      throw new ValidationError("revenueAmount must be >= 0");
    }

    const entity = await prisma.entity.findFirst({
      where: {
        firmId: this.session.firmId,
        clientId: this.session.clientId,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!entity) {
      throw new ValidationError("No entity available for this client");
    }

    const created = await prisma.revenueEntry.create({
      data: {
        firmId: this.session.firmId,
        entityId: entity.id,
        stateCode: input.stateCode.toUpperCase(),
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        amount: input.revenueAmount,
        transactionCount: 0,
        source: "CLIENT_PORTAL",
        enteredByUserId: null,
        clientAcknowledgedAt: null,
      },
      select: { id: true },
    });

    await this.notifyFirmAdminRevenueSubmission({
      stateCode: input.stateCode.toUpperCase(),
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      revenueAmount: input.revenueAmount,
    });

    return { id: created.id };
  }

  private async notifyFirmAdminRevenueSubmission(input: {
    stateCode: string;
    periodYear: number;
    periodMonth: number;
    revenueAmount: number;
  }) {
    if (!process.env.RESEND_API_KEY) return;

    const [admins, firm, client] = await Promise.all([
      prisma.user.findMany({
        where: {
          firmId: this.session.firmId,
          role: "FIRM_ADMIN",
        },
        select: { email: true },
      }),
      prisma.firm.findUnique({
        where: { id: this.session.firmId },
        select: { name: true },
      }),
      prisma.client.findUnique({
        where: { id: this.session.clientId },
        select: { name: true },
      }),
    ]);

    const recipients = admins.map((a) => a.email).filter(Boolean);
    if (!recipients.length) return;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "portal@regitrackr.app",
      to: recipients,
      subject: `Portal revenue submission: ${client?.name ?? "Client"}`,
      text: [
        `Firm: ${firm?.name ?? this.session.firmId}`,
        `Client: ${client?.name ?? this.session.clientId}`,
        `State: ${input.stateCode}`,
        `Period: ${input.periodYear}-${String(input.periodMonth).padStart(2, "0")}`,
        `Revenue amount: $${input.revenueAmount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
        `Submitted at: ${new Date().toISOString()}`,
      ].join("\n"),
    });
  }

  async getRevenueSubmissionStates(): Promise<string[]> {
    const currentYear = new Date().getUTCFullYear();
    const revenues = await prisma.revenueEntry.findMany({
      where: {
        firmId: this.session.firmId,
        entity: { clientId: this.session.clientId },
        periodYear: currentYear,
      },
      distinct: ["stateCode"],
      orderBy: { stateCode: "asc" },
      select: { stateCode: true },
    });
    const thresholdStates = await prisma.stateThreshold.findMany({
      where: { version: 1 },
      orderBy: { stateCode: "asc" },
      select: { stateCode: true },
    });
    const set = new Set<string>(thresholdStates.map((s) => s.stateCode));
    for (const rev of revenues) set.add(rev.stateCode);
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }
}

export function portalScopeYtdStart(): Date {
  return firstDayUtcOfYear(new Date().getUTCFullYear());
}
