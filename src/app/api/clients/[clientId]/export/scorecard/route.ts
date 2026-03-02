import { auth } from "@clerk/nextjs/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { NexusBand } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import {
  buildRiskScorecardPdfDocument,
  type RiskScorecardNexusRow,
  type RiskScorecardDeadlineRow,
} from "@/lib/pdf/risk-scorecard";
import { getTenantContext } from "@/lib/services/auth.service";
import { getNarrative, narrativeCacheKey, redis } from "@/lib/redis/client";
import { AuthError, ResourceNotFoundError } from "@/lib/utils/errors";

export const runtime = "nodejs";

const BAND_PRIORITY: Record<NexusBand, number> = {
  TRIGGERED: 0,
  URGENT: 1,
  WARNING: 2,
  REGISTERED: 3,
  SAFE: 4,
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toSafeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function periodLabel(periodYear: number, periodMonth: number | null, periodQuarter: number | null): string {
  if (periodQuarter) return `${periodYear} Q${periodQuarter}`;
  if (periodMonth) return `${periodYear}-${String(periodMonth).padStart(2, "0")}`;
  return String(periodYear);
}

async function enforceRateLimit(firmId: string): Promise<number | null> {
  const key = `ratelimit:pdf:${firmId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3600);
  }
  if (count <= 20) {
    return null;
  }

  const ttl = Number(await redis.ttl(key));
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 3600;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }
    const tenant = await getTenantContext(userId);
    const retryAfter = await enforceRateLimit(tenant.firmId);
    if (retryAfter !== null) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const { clientId } = await params;
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        firmId: true,
        entities: {
          select: { id: true, name: true },
        },
      },
    });
    if (!client) {
      throw new ResourceNotFoundError("Client not found");
    }
    if (client.firmId !== tenant.firmId) {
      throw new AuthError("Forbidden");
    }

    const entityIds = client.entities.map((e) => e.id);
    const now = new Date();
    const year = now.getUTCFullYear();
    const next30 = new Date(now);
    next30.setUTCDate(next30.getUTCDate() + 30);
    const past30 = new Date(now);
    past30.setUTCDate(past30.getUTCDate() - 30);

    const [firm, thresholds, revenues, registrations, filings, latestSummary] = await Promise.all([
      prisma.firm.findUnique({
        where: { id: tenant.firmId },
        select: { name: true },
      }),
      prisma.stateThreshold.findMany({
        where: { version: 1 },
        select: { stateCode: true, salesThreshold: true },
      }),
      prisma.revenueEntry.findMany({
        where: {
          firmId: tenant.firmId,
          entityId: { in: entityIds },
          periodYear: year,
        },
        select: { stateCode: true, amount: true },
      }),
      prisma.nexusRegistration.findMany({
        where: {
          firmId: tenant.firmId,
          entityId: { in: entityIds },
        },
        select: { stateCode: true, status: true },
      }),
      prisma.filingRecord.findMany({
        where: {
          firmId: tenant.firmId,
          entityId: { in: entityIds },
          OR: [
            { dueDate: { gte: now, lte: next30 } },
            { status: "OVERDUE", dueDate: { gte: past30, lt: now } },
          ],
        },
        orderBy: [{ dueDate: "asc" }],
        select: {
          stateCode: true,
          periodYear: true,
          periodMonth: true,
          periodQuarter: true,
          dueDate: true,
          status: true,
        },
      }),
      prisma.aiSummary.findFirst({
        where: {
          firmId: tenant.firmId,
          clientId,
          entityId: { not: null },
        },
        orderBy: { generatedAt: "desc" },
        select: {
          entityId: true,
          inputHash: true,
        },
      }),
    ]);

    const revenueByState = new Map<string, number>();
    for (const revenue of revenues) {
      revenueByState.set(revenue.stateCode, (revenueByState.get(revenue.stateCode) ?? 0) + Number(revenue.amount));
    }
    const registrationByState = new Set(
      registrations.filter((r) => r.status === "REGISTERED").map((r) => r.stateCode),
    );

    const nexusRows: RiskScorecardNexusRow[] = thresholds
      .map((threshold) => {
        const revenueYtd = revenueByState.get(threshold.stateCode) ?? 0;
        const thresholdValue = Number(threshold.salesThreshold);
        const thresholdPercent = thresholdValue > 0 ? (revenueYtd / thresholdValue) * 100 : 0;
        let band: NexusBand = "SAFE";
        if (registrationByState.has(threshold.stateCode)) {
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
        };
      })
      .filter((r) => r.revenueYtd > 0 || r.band === "TRIGGERED" || r.band === "URGENT" || r.band === "WARNING")
      .sort((a, b) => {
        const bandDiff = BAND_PRIORITY[a.band] - BAND_PRIORITY[b.band];
        if (bandDiff !== 0) return bandDiff;
        return b.thresholdPercent - a.thresholdPercent;
      });

    const registrationGaps = nexusRows
      .filter((row) => row.band === "TRIGGERED" && !registrationByState.has(row.stateCode))
      .map((row) => row.stateCode);

    const deadlineRows: RiskScorecardDeadlineRow[] = filings.map((filing) => ({
      stateCode: filing.stateCode,
      periodLabel: periodLabel(filing.periodYear, filing.periodMonth, filing.periodQuarter),
      dueDate: formatDate(filing.dueDate),
      daysUntilDue: Math.ceil((filing.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      status: filing.status,
    }));

    let aiNarrative: string | null = null;
    if (latestSummary?.entityId && latestSummary.inputHash) {
      const cacheKey = narrativeCacheKey(latestSummary.entityId, latestSummary.inputHash);
      const cached = await getNarrative(cacheKey);
      aiNarrative = cached?.summaryText ?? null;
    }

    const generatedDate = new Date().toISOString().slice(0, 10);
    const pdfDocument = buildRiskScorecardPdfDocument({
      firmName: firm?.name ?? "Firm",
      generatedDate,
      clientName: client.name,
      entityName:
        client.entities.length > 1
          ? `${client.entities[0]?.name ?? "N/A"} +${client.entities.length - 1} more`
          : client.entities[0]?.name ?? "N/A",
      nexusRows,
      registrationGaps,
      deadlineRows,
      aiNarrative,
    });

    const pdfBuffer = await renderToBuffer(pdfDocument);
    const safeClientName = toSafeFilename(client.name || "Client");
    const filename = `${safeClientName}_ComplianceScorecard_${generatedDate}.pdf`;

    return new NextResponse(pdfBuffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
