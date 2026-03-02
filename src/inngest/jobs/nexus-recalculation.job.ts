import * as Sentry from "@sentry/nextjs";
import prisma from "@/lib/db/prisma";
import { reconcileClientCount } from "@/lib/services/billing.service";
import { NexusService } from "@/lib/services/nexus.service";
import { log } from "@/lib/utils/logger";
import { inngest } from "@/inngest/client";

type NexusRecalcEvent = {
  name: "regitrackr/nexus.recalculate";
  data?: {
    firmId?: string;
  };
};

async function processFirmNexusRecalculation(firmId: string) {
  return Sentry.startSpan(
    {
      name: "inngest.nexus_recalculation.firm",
      op: "job",
      attributes: { firmId },
    },
    async () => {
      const firm = await prisma.firm.findUnique({
        where: { id: firmId },
        select: { id: true, billingTier: true },
      });
      if (!firm) return { entitiesProcessed: 0, alertsGenerated: 0, errors: 0, corrected: false };

      const reconcile = await reconcileClientCount(firm.id);
      if (reconcile.corrected) {
        log("warn", "billing client count drift corrected", {
          firmId: firm.id,
          service: "NexusRecalculationJob",
          jobName: "nexus-recalculation",
        });
      }

      const entityIds = await prisma.entity.findMany({
        where: { firmId: firm.id },
        select: { id: true },
      });
      const nexusService = new NexusService({
        firmId: firm.id,
        userId: "inngest-system",
        billingTier: firm.billingTier,
      });

      let entitiesProcessed = 0;
      let alertsGenerated = 0;
      let errors = 0;

      for (let i = 0; i < entityIds.length; i += 10) {
        const batch = entityIds.slice(i, i + 10);
        const batchResults = await Promise.allSettled(
          batch.map(async (entity) => {
            const result = await nexusService.calculateEntityNexus(entity.id);
            return result.alerts.length;
          }),
        );

        for (const result of batchResults) {
          if (result.status === "fulfilled") {
            entitiesProcessed += 1;
            alertsGenerated += result.value;
          } else {
            errors += 1;
            log("error", "entity processing failure", {
              firmId: firm.id,
              service: "NexusRecalculationJob",
              jobName: "nexus-recalculation",
              error: result.reason,
            });
          }
        }
      }

      return {
        entitiesProcessed,
        alertsGenerated,
        errors,
        corrected: reconcile.corrected,
      };
    },
  );
}

export const nexusRecalculationCronJob = inngest.createFunction(
  {
    id: "nexus-recalculation-nightly",
    retries: 3,
    concurrency: { limit: 10 },
  },
  { cron: "0 2 * * *" },
  async ({ step }) => {
    return step.run("recalculate-nexus-for-firms", async () => {
      try {
        log("info", "nexus recalculation job started", {
          service: "NexusRecalculationJob",
          jobName: "nexus-recalculation",
        });

        const firms = await prisma.firm.findMany({
          select: { id: true },
        });

        let entitiesProcessed = 0;
        let alertsGenerated = 0;
        let errors = 0;

        for (const firm of firms) {
          const summary = await processFirmNexusRecalculation(firm.id);
          entitiesProcessed += summary.entitiesProcessed;
          alertsGenerated += summary.alertsGenerated;
          errors += summary.errors;
        }

        const payload = { entitiesProcessed, alertsGenerated, errors, firmCount: firms.length };
        log("info", "nexus recalculation job completed", {
          service: "NexusRecalculationJob",
          jobName: "nexus-recalculation",
        });
        return payload;
      } catch (error) {
        log("error", "nexus recalculation job failed", {
          service: "NexusRecalculationJob",
          jobName: "nexus-recalculation",
          error,
        });
        throw error;
      }
    });
  },
);

export const nexusRecalculationEventJob = inngest.createFunction(
  {
    id: "nexus-recalculation-event",
    retries: 3,
    concurrency: { limit: 10 },
  },
  { event: "regitrackr/nexus.recalculate" },
  async ({ event, step }) => {
    return step.run("recalculate-nexus-from-event", async () => {
      const data = (event as NexusRecalcEvent).data;
      try {
        log("info", "nexus recalculation event started", {
          firmId: data?.firmId,
          service: "NexusRecalculationJob",
          jobName: "nexus-recalculation",
        });

        if (data?.firmId) {
          const summary = await processFirmNexusRecalculation(data.firmId);
          log("info", "nexus recalculation event completed", {
            firmId: data.firmId,
            service: "NexusRecalculationJob",
            jobName: "nexus-recalculation",
          });
          return summary;
        }

        const firms = await prisma.firm.findMany({ select: { id: true } });
        let entitiesProcessed = 0;
        let alertsGenerated = 0;
        let errors = 0;
        for (const firm of firms) {
          const summary = await processFirmNexusRecalculation(firm.id);
          entitiesProcessed += summary.entitiesProcessed;
          alertsGenerated += summary.alertsGenerated;
          errors += summary.errors;
        }
        const payload = { entitiesProcessed, alertsGenerated, errors, firmCount: firms.length };
        log("info", "nexus recalculation event completed", {
          service: "NexusRecalculationJob",
          jobName: "nexus-recalculation",
        });
        return payload;
      } catch (error) {
        log("error", "nexus recalculation event failed", {
          firmId: data?.firmId,
          service: "NexusRecalculationJob",
          jobName: "nexus-recalculation",
          error,
        });
        throw error;
      }
    });
  },
);
