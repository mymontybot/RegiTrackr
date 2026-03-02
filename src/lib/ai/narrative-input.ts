import { createHash } from "node:crypto";
import prisma from "@/lib/db/prisma";
import { calculateNexus } from "@/lib/engines/nexus.engine";
import { sanitizeForPrompt } from "@/lib/ai/sanitize";
import { narrativeInputSchema, type NarrativeInput } from "@/lib/validators/narrative.schemas";
import { ResourceNotFoundError } from "@/lib/utils/errors";

export async function buildNarrativeInput(
  firmId: string,
  entityId: string,
): Promise<{ input: NarrativeInput; inputHash: string }> {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: {
      id: true,
      firmId: true,
      name: true,
      entityType: true,
    },
  });
  if (!entity) throw new ResourceNotFoundError("Entity not found");
  if (entity.firmId !== firmId) throw new ResourceNotFoundError("Entity not found");

  const now = new Date();
  const next60 = new Date(now);
  next60.setUTCDate(next60.getUTCDate() + 60);

  const [revenueEntries, stateThresholds, registrations, upcomingFilings, overdueFilings, alerts] =
    await Promise.all([
      prisma.revenueEntry.findMany({
        where: { firmId, entityId },
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
          notes: true,
        },
      }),
      prisma.nexusRegistration.findMany({
        where: { firmId, entityId },
        select: {
          entityId: true,
          stateCode: true,
          status: true,
          notes: true,
        },
      }),
      prisma.filingRecord.findMany({
        where: {
          firmId,
          entityId,
          dueDate: { gte: now, lte: next60 },
        },
        orderBy: [{ dueDate: "asc" }],
        select: {
          stateCode: true,
          dueDate: true,
          periodYear: true,
          periodMonth: true,
          periodQuarter: true,
          status: true,
        },
      }),
      prisma.filingRecord.findMany({
        where: {
          firmId,
          entityId,
          status: "OVERDUE",
        },
        orderBy: [{ dueDate: "asc" }],
        select: {
          stateCode: true,
          dueDate: true,
          periodYear: true,
          periodMonth: true,
          periodQuarter: true,
        },
      }),
      prisma.alert.findMany({
        where: { firmId, entityId, isSnoozed: false },
        select: { alertType: true, band: true },
      }),
    ]);

  const engineOutput = calculateNexus({
    entityId,
    firmId,
    revenueEntries: revenueEntries.map((entry) => ({
      entityId: entry.entityId,
      stateCode: entry.stateCode,
      periodYear: entry.periodYear,
      periodMonth: entry.periodMonth,
      amount: Number(entry.amount),
      transactionCount: entry.transactionCount,
    })),
    stateThresholds: stateThresholds.map((threshold) => ({
      stateCode: threshold.stateCode,
      stateName: sanitizeForPrompt(threshold.stateName),
      salesThreshold: Number(threshold.salesThreshold),
      transactionThreshold: threshold.transactionThreshold,
      measurementPeriod: threshold.measurementPeriod,
    })),
    registrations: registrations.map((registration) => ({
      entityId: registration.entityId,
      stateCode: registration.stateCode,
      status: registration.status,
    })),
    asOfDate: now,
  });

  const dataQualityFlags = Array.from(
    new Set(engineOutput.results.flatMap((r) => r.dataQualityFlags)),
  ).map((flag) => sanitizeForPrompt(flag));

  const velocityData = engineOutput.results
    .filter((r) => r.band === "URGENT" || r.band === "TRIGGERED")
    .map((r) => ({
      stateCode: sanitizeForPrompt(r.stateCode),
      trailing60DayMonthlyAvg: r.velocityData.trailing60DayMonthlyAvg,
      estimatedDaysToThreshold: r.velocityData.estimatedDaysToThreshold,
    }));

  const alertsBySeverity = {
    warning: alerts.filter((a) => a.alertType === "WARNING_70").length,
    urgent: alerts.filter((a) => a.alertType === "URGENT_90").length,
    triggered: alerts.filter(
      (a) => a.alertType === "TRIGGERED_100" || a.alertType === "TRIGGERED_NOT_REGISTERED",
    ).length,
  };

  const input: NarrativeInput = {
    entityName: sanitizeForPrompt(entity.name),
    entityType: sanitizeForPrompt(entity.entityType),
    nexusResults: engineOutput.results.map((result) => ({
      stateCode: sanitizeForPrompt(result.stateCode),
      stateName: sanitizeForPrompt(result.stateName),
      totalRevenue: result.totalRevenue,
      revenueThreshold: result.revenueThreshold,
      percentOfRevenue: result.percentOfRevenue,
      totalTransactions: result.totalTransactions,
      transactionThreshold: result.transactionThreshold,
      percentOfTransactions: result.percentOfTransactions,
      controllingPercent: result.controllingPercent,
      band: result.band,
      dataQualityFlags: result.dataQualityFlags.map((flag) => sanitizeForPrompt(flag)),
    })),
    upcomingDeadlines: upcomingFilings.map((filing) => ({
      stateCode: sanitizeForPrompt(filing.stateCode),
      dueDate: filing.dueDate.toISOString(),
      filingPeriod: sanitizeForPrompt(
        `${filing.periodYear}-${String((filing.periodMonth ?? 0)).padStart(2, "0")}${filing.periodQuarter ? `-Q${filing.periodQuarter}` : ""}`,
      ),
      status: sanitizeForPrompt(filing.status),
    })),
    overdueFilings: overdueFilings.map((filing) => ({
      stateCode: sanitizeForPrompt(filing.stateCode),
      dueDate: filing.dueDate.toISOString(),
      filingPeriod: sanitizeForPrompt(
        `${filing.periodYear}-${String((filing.periodMonth ?? 0)).padStart(2, "0")}${filing.periodQuarter ? `-Q${filing.periodQuarter}` : ""}`,
      ),
    })),
    dataQualityFlags,
    velocityData: velocityData.length > 0 ? velocityData : undefined,
    activeAlertCount: alerts.length,
    alertsBySeverity,
  };

  const validated = narrativeInputSchema.parse(input);
  const inputHash = createHash("sha256").update(JSON.stringify(validated)).digest("hex");
  return { input: validated, inputHash };
}
