import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { buildNarrativeInput } from "@/lib/ai/narrative-input";
import { generateNarrative } from "@/lib/ai/narrative.engine";
import { getTenantContext } from "@/lib/services/auth.service";
import { narrativeCacheKey, redis } from "@/lib/redis/client";
import { log } from "@/lib/utils/logger";
import { narrativeOutputSchema } from "@/lib/validators/narrative.schemas";
import { AuthError, NarrativeGenerationError } from "@/lib/utils/errors";

const RATE_LIMIT_MAX = 10;

async function checkRateLimit(firmId: string): Promise<number | null> {
  const key = `ratelimit:narrative:${firmId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  if (count <= RATE_LIMIT_MAX) return null;
  const ttl = Number(await redis.ttl(key));
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 60;
}

function failureResponse(status = 200): NextResponse {
  return NextResponse.json({ success: false }, { status });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const requestStartedAt = Date.now();
  let firmIdForLogs: string | undefined;
  let userIdForLogs: string | undefined;
  let entityIdForLogs: string | undefined;

  try {
    const body = (await req.json().catch(() => ({}))) as { forceRefresh?: boolean };
    const forceRefresh = Boolean(body.forceRefresh);

    const { userId } = await auth();
    if (!userId) throw new AuthError("Authentication required");
    userIdForLogs = userId;

    const tenant = await getTenantContext(userId);
    firmIdForLogs = tenant.firmId;
    const retryAfter = await checkRateLimit(tenant.firmId);
    if (retryAfter !== null) {
      return NextResponse.json(
        { success: false },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const { entityId } = await params;
    entityIdForLogs = entityId;

    return Sentry.startSpan(
      {
        name: "api.narratives.generate",
        op: "http.server",
        attributes: {
          route: "/api/narratives/[entityId]",
        },
      },
      async () => {
        const scopedEntity = await prisma.entity.findUnique({
          where: { id: entityId },
          select: { id: true, firmId: true },
        });
        if (!scopedEntity) return failureResponse(404);
        if (scopedEntity.firmId !== tenant.firmId) return failureResponse(403);

        const latestSummary = await prisma.aiSummary.findFirst({
          where: {
            firmId: tenant.firmId,
            entityId,
            summaryType: "NEXUS_EXPOSURE_NARRATIVE",
          },
          orderBy: { generatedAt: "desc" },
          select: { inputHash: true },
        });
        if (!forceRefresh && latestSummary?.inputHash) {
          const cachedFast = await redis.get(`${narrativeCacheKey(entityId, latestSummary.inputHash)}`);
          const parsed = narrativeOutputSchema.safeParse(cachedFast);
          if (parsed.success) {
            log(
              "info",
              `narrative cache hit latency_ms=${Date.now() - requestStartedAt} cache_hit=true`,
              {
                firmId: tenant.firmId,
                userId: tenant.userId,
                entityId,
                service: "NarrativeRoute",
              },
            );
            return NextResponse.json({ ...parsed.data, cached: true });
          }
        }

        const { input, inputHash } = await buildNarrativeInput(tenant.firmId, entityId);
        const cacheKey = narrativeCacheKey(entityId, inputHash);
        if (!forceRefresh) {
          const cached = await redis.get(cacheKey);
          const parsedCached = narrativeOutputSchema.safeParse(cached);
          if (parsedCached.success) {
            log(
              "info",
              `narrative cache hit latency_ms=${Date.now() - requestStartedAt} cache_hit=true`,
              {
                firmId: tenant.firmId,
                userId: tenant.userId,
                entityId,
                service: "NarrativeRoute",
              },
            );
            return NextResponse.json({ ...parsedCached.data, cached: true });
          }
        }

        const generationStartedAt = Date.now();
        const generated = await generateNarrative(input);
        const generationLatency = Date.now() - generationStartedAt;
        if (!generated) {
          log("warn", `narrative generation failed generation_latency_ms=${generationLatency}`, {
            firmId: tenant.firmId,
            userId: tenant.userId,
            entityId,
            service: "NarrativeRoute",
            error: new NarrativeGenerationError("Narrative generation failed"),
          });
          return failureResponse();
        }

        const validated = narrativeOutputSchema.safeParse(generated);
        if (!validated.success) {
          log("warn", "narrative output schema validation failed", {
            firmId: tenant.firmId,
            userId: tenant.userId,
            entityId,
            service: "NarrativeRoute",
            error: new NarrativeGenerationError("Narrative output validation failed"),
          });
          return failureResponse();
        }

        await redis.set(cacheKey, validated.data, { ex: 86400 });

        await prisma.aiSummary.create({
          data: {
            firmId: tenant.firmId,
            entityId,
            clientId: null,
            summaryType: "NEXUS_EXPOSURE_NARRATIVE",
            inputHash,
            summaryText: validated.data.summaryText,
            highlights: validated.data.highlights,
            dataQualityFlags: validated.data.dataQualityFlags,
            generatedAt: new Date(validated.data.generatedAt),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            modelId: validated.data.modelId,
            refreshReason: "API_REQUEST",
            createdByUserId: tenant.userId,
          },
        });

        await prisma.narrativeHistory.create({
          data: {
            firmId: tenant.firmId,
            entityId,
            summaryText: validated.data.summaryText,
            highlights: validated.data.highlights,
            dataQualityFlags: validated.data.dataQualityFlags,
            generatedAt: new Date(validated.data.generatedAt),
            modelId: validated.data.modelId,
            inputSnapshot: input,
            retainUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        log(
          "info",
          `narrative generated cache_hit=false generation_latency_ms=${generationLatency} total_latency_ms=${Date.now() - requestStartedAt}`,
          {
            firmId: tenant.firmId,
            userId: tenant.userId,
            entityId,
            service: "NarrativeRoute",
          },
        );

        return NextResponse.json(validated.data);
      },
    );
  } catch (error) {
    log("error", "narrative route failed", {
      firmId: firmIdForLogs,
      userId: userIdForLogs,
      entityId: entityIdForLogs,
      service: "NarrativeRoute",
      error,
    });
    return failureResponse();
  }
}
