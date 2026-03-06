/**
 * Threshold monitoring scheduler — queues all states due for review.
 * Runs 3am UTC every Monday. Fans out to threshold-monitor-state in batches.
 *
 * Cost estimate: ~50 states × ~1,500 input tokens × ~200 output tokens =
 * roughly $0.08–$0.15 per full weekly run at current pricing. Negligible.
 */

import prisma from "@/lib/db/prisma";
import { log } from "@/lib/utils/logger";
import { inngest } from "@/inngest/client";

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 2000;
const MAX_STATES_PER_RUN = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * 500);
}

export const thresholdMonitorAllJob = inngest.createFunction(
  {
    id: "threshold-monitor-all-weekly",
    retries: 2,
  },
  { cron: "0 3 * * 1" },
  async ({ step }) => {
    return step.run("queue-threshold-checks", async () => {
      try {
        log("info", "threshold monitor all job started", {
          service: "ThresholdMonitorAll",
          jobName: "threshold-monitor-all",
        });

        const now = new Date();

        const due = await prisma.stateThreshold.findMany({
          where: {
            source_url: { not: null },
            OR: [
              { nextReviewDue: { lte: now } },
              { nextReviewDue: null },
            ],
          },
          select: {
            id: true,
            stateCode: true,
            source_url: true,
          },
          take: MAX_STATES_PER_RUN,
        });

        const withUrl = due.filter((r) => r.source_url != null);
        const totalQueued = withUrl.length;

        const batches: typeof withUrl[] = [];
        for (let i = 0; i < withUrl.length; i += BATCH_SIZE) {
          batches.push(withUrl.slice(i, i + BATCH_SIZE));
        }

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          if (!batch.length) continue;

          const events = batch.map((row) => ({
            name: "regitrackr/threshold.monitor-state" as const,
            data: {
              stateCode: row.stateCode,
              stateThresholdId: row.id,
              sourceUrl: row.source_url!,
            },
          }));

          await inngest.send(events);

          if (i < batches.length - 1) {
            await sleep(jitter(DELAY_BETWEEN_BATCHES_MS));
          }
        }

        const skipped = due.length - withUrl.length;
        const payload = {
          totalQueued,
          batchesSent: batches.length,
          skipped,
        };

        log("info", "threshold monitor all job completed", {
          service: "ThresholdMonitorAll",
          jobName: "threshold-monitor-all",
          ...payload,
        });
        return payload;
      } catch (error) {
        log("error", "threshold monitor all job failed", {
          service: "ThresholdMonitorAll",
          jobName: "threshold-monitor-all",
          error,
        });
        throw error;
      }
    });
  },
);
