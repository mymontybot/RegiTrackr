import prisma from "@/lib/db/prisma";
import { buildNarrativeInput } from "@/lib/ai/narrative-input";
import { generateNarrative } from "@/lib/ai/narrative.engine";
import { narrativeCacheKey, redis } from "@/lib/redis/client";
import { log } from "@/lib/utils/logger";
import { narrativeOutputSchema } from "@/lib/validators/narrative.schemas";
import { inngest } from "@/inngest/client";

type NarrativeRefreshEvent = {
  name: "regitrackr/narrative.refresh";
  data: {
    firmId: string;
    entityId: string;
    reason?: string;
  };
};

async function refreshEntityNarrative(data: NarrativeRefreshEvent["data"]) {
  const { input, inputHash } = await buildNarrativeInput(data.firmId, data.entityId);
  const generated = await generateNarrative(input);
  if (!generated) {
    return { success: false as const, cached: false, reason: "generation_failed" };
  }

  const validated = narrativeOutputSchema.safeParse(generated);
  if (!validated.success) {
    return { success: false as const, cached: false, reason: "schema_validation_failed" };
  }

  const cacheKey = narrativeCacheKey(data.entityId, inputHash);
  await redis.set(cacheKey, validated.data, { ex: 86400 });

  await prisma.aiSummary.create({
    data: {
      firmId: data.firmId,
      entityId: data.entityId,
      clientId: null,
      summaryType: "NEXUS_EXPOSURE_NARRATIVE",
      inputHash,
      summaryText: validated.data.summaryText,
      highlights: validated.data.highlights,
      dataQualityFlags: validated.data.dataQualityFlags,
      generatedAt: new Date(validated.data.generatedAt),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      modelId: validated.data.modelId,
      refreshReason: data.reason ?? "SCHEDULED_REFRESH",
      createdByUserId: null,
    },
  });

  await prisma.narrativeHistory.create({
    data: {
      firmId: data.firmId,
      entityId: data.entityId,
      summaryText: validated.data.summaryText,
      highlights: validated.data.highlights,
      dataQualityFlags: validated.data.dataQualityFlags,
      generatedAt: new Date(validated.data.generatedAt),
      modelId: validated.data.modelId,
      inputSnapshot: input,
      retainUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return { success: true as const, cached: false, reason: data.reason ?? "SCHEDULED_REFRESH" };
}

export const narrativeCacheRefreshCronJob = inngest.createFunction(
  {
    id: "narrative-cache-refresh-nightly",
    retries: 3,
  },
  { cron: "0 4 * * *" },
  async ({ step }) => {
    return step.run("schedule-narrative-refresh", async () => {
      try {
        log("info", "narrative cache refresh cron started", {
          service: "NarrativeCacheRefreshJob",
          jobName: "narrative-cache-refresh",
        });
        const now = Date.now();
        const plusTwoHours = new Date(now + 2 * 60 * 60 * 1000);

        const expiring = await prisma.aiSummary.findMany({
          where: {
            summaryType: "NEXUS_EXPOSURE_NARRATIVE",
            entityId: { not: null },
            expiresAt: { not: null, lte: plusTwoHours },
          },
          orderBy: { expiresAt: "asc" },
          select: {
            firmId: true,
            entityId: true,
          },
        });

        const deduped = new Map<string, { firmId: string; entityId: string }>();
        for (const row of expiring) {
          if (!row.entityId) continue;
          deduped.set(`${row.firmId}:${row.entityId}`, {
            firmId: row.firmId,
            entityId: row.entityId,
          });
        }

        const events = Array.from(deduped.values()).map((item) => ({
          name: "regitrackr/narrative.refresh" as const,
          data: {
            firmId: item.firmId,
            entityId: item.entityId,
            reason: "EXPIRING_WITHIN_2H",
          },
        }));

        if (events.length > 0) {
          await inngest.send(events);
        }

        const payload = {
          expiringFound: expiring.length,
          refreshQueued: events.length,
        };
        log("info", "narrative cache refresh cron completed", {
          service: "NarrativeCacheRefreshJob",
          jobName: "narrative-cache-refresh",
        });
        return payload;
      } catch (error) {
        log("error", "narrative cache refresh cron failed", {
          service: "NarrativeCacheRefreshJob",
          jobName: "narrative-cache-refresh",
          error,
        });
        throw error;
      }
    });
  },
);

export const narrativeCacheRefreshEventJob = inngest.createFunction(
  {
    id: "narrative-cache-refresh-event",
    retries: 3,
  },
  { event: "regitrackr/narrative.refresh" },
  async ({ event, step }) => {
    return step.run("refresh-narrative-from-event", async () => {
      const data = (event as NarrativeRefreshEvent).data;
      log("info", "narrative cache refresh event started", {
        firmId: data.firmId,
        entityId: data.entityId,
        service: "NarrativeCacheRefreshJob",
        jobName: "narrative-cache-refresh",
      });

      try {
        const result = await refreshEntityNarrative(data);
        const payload = {
          successCount: result.success ? 1 : 0,
          failureCount: result.success ? 0 : 1,
          result,
        };
        log("info", "narrative cache refresh event completed", {
          firmId: data.firmId,
          entityId: data.entityId,
          service: "NarrativeCacheRefreshJob",
          jobName: "narrative-cache-refresh",
        });
        return payload;
      } catch (error) {
        log("error", "narrative cache refresh event failed", {
          firmId: data.firmId,
          entityId: data.entityId,
          service: "NarrativeCacheRefreshJob",
          jobName: "narrative-cache-refresh",
          error,
        });
        throw error;
      }
    });
  },
);
