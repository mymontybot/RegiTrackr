/**
 * Threshold monitoring job — single state.
 * Called by threshold-monitor-all. Uses Claude to analyze scraped page text
 * and flag potential threshold changes for human review.
 *
 * Cost estimate: ~50 states × ~1,500 input tokens × ~200 output tokens =
 * roughly $0.08–$0.15 per full weekly run at current pricing. Negligible.
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db/prisma";
import { log } from "@/lib/utils/logger";
import { inngest } from "@/inngest/client";

const THRESHOLD_ANALYSIS_SYSTEM_PROMPT = `You are a tax compliance data analyst. You will be given text scraped from a U.S. state revenue department website and the current threshold values stored in our database. Your job is to determine if the page suggests the economic nexus thresholds may have changed. Be conservative — only flag if you see specific dollar amounts or transaction counts that differ from what we store. Do not flag based on general policy text, disclaimers, or ambiguous language. Respond ONLY with valid JSON matching this schema exactly:
{
  "changeDetected": boolean,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "detectedSalesThreshold": number | null,
  "detectedTransactionThreshold": number | null,
  "relevantSnippet": string | null,
  "reasoning": string
}`;

const MAX_PAGE_CHARS = 3000;
const MAX_SNIPPET_CHARS = 500;
const FETCH_TIMEOUT_MS = 15_000;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "...";
}

function parseJsonFromResponse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

type ThresholdMonitorEvent = {
  name: "regitrackr/threshold.monitor-state";
  data: {
    stateCode: string;
    stateThresholdId: string;
    sourceUrl: string;
  };
};

export const thresholdMonitorStateJob = inngest.createFunction(
  {
    id: "threshold-monitor-state",
    retries: 2,
  },
  { event: "regitrackr/threshold.monitor-state" },
  async ({ event, step }) => {
    const { stateCode, stateThresholdId, sourceUrl } = (event as ThresholdMonitorEvent).data;

    const threshold = await step.run("fetch-threshold", async () => {
      const row = await prisma.stateThreshold.findUnique({
        where: { id: stateThresholdId },
        select: {
          salesThreshold: true,
          transactionThreshold: true,
          measurementPeriod: true,
        },
      });
      if (!row) {
        throw new Error(`StateThreshold not found: ${stateThresholdId}`);
      }
      return {
        salesThreshold: Number(row.salesThreshold),
        transactionThreshold: row.transactionThreshold,
        measurementPeriod: row.measurementPeriod,
      };
    });

    const pageText = await step.run("fetch-page", async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(sourceUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; RegiTrackrThresholdMonitor/1.0; +https://regitrackr.com)",
          },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const html = await res.text();
        const text = stripHtml(html);
        return truncate(text, MAX_PAGE_CHARS);
      } catch (err) {
        clearTimeout(timeout);
        await prisma.thresholdChangeFlag.create({
          data: {
            stateCode,
            stateThresholdId,
            flagType: "SCRAPE_ERROR",
            status: "PENDING",
            sourceUrl,
          },
        });
        log("warn", "threshold monitor fetch failed", {
          stateCode,
          sourceUrl,
          error: err,
        });
        return null;
      } finally {
        clearTimeout(timeout);
      }
    });

    if (pageText === null) {
      return { status: "fetch_failed", flagCreated: true };
    }

    const analysis = await step.run("analyze-with-claude", async () => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("Missing ANTHROPIC_API_KEY");
      }
      const client = new Anthropic({ apiKey });
      const userMessage = `Current stored values for ${stateCode}:
Sales threshold: $${threshold.salesThreshold}
Transaction threshold: ${threshold.transactionThreshold ?? "null"} transactions
Measurement period: ${threshold.measurementPeriod}

Page text scraped from ${sourceUrl}:
${pageText}`;

      const result = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: THRESHOLD_ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const textPart = result.content.find((c) => c.type === "text");
      return textPart?.text ?? "";
    });

    return step.run("evaluate-and-act", async () => {
      const parsed = parseJsonFromResponse(analysis);
      if (!parsed) {
        await prisma.thresholdChangeFlag.create({
          data: {
            stateCode,
            stateThresholdId,
            flagType: "SCRAPE_ERROR",
            status: "PENDING",
            sourceUrl,
            rawSnippet: truncate(analysis.length > 0 ? analysis : "Invalid JSON response", MAX_SNIPPET_CHARS),
          },
        });
        return { status: "parse_error", flagCreated: true };
      }

      const changeDetected = parsed.changeDetected === true;
      const confidence = parsed.confidence as string | undefined;

      if (changeDetected && (confidence === "HIGH" || confidence === "MEDIUM")) {
        const detectedSales = parsed.detectedSalesThreshold as number | null | undefined;
        const detectedTransaction = parsed.detectedTransactionThreshold as number | null | undefined;
        const detectedValue = JSON.stringify({
          sales: detectedSales ?? null,
          transactions: detectedTransaction ?? null,
        });
        const currentValue = JSON.stringify({
          sales: threshold.salesThreshold,
          transactions: threshold.transactionThreshold ?? null,
        });
        const relevantSnippet = (parsed.relevantSnippet as string | null) ?? null;

        await prisma.thresholdChangeFlag.create({
          data: {
            stateCode,
            stateThresholdId,
            flagType: "AMOUNT_CHANGE",
            detectedValue,
            currentValue,
            sourceUrl,
            rawSnippet: relevantSnippet ? truncate(relevantSnippet, MAX_SNIPPET_CHARS) : null,
            status: "PENDING",
          },
        });
        return { status: "change_flagged", flagCreated: true };
      }

      const now = new Date();
      const nextReview = new Date(now);
      nextReview.setDate(nextReview.getDate() + 90);

      await prisma.stateThreshold.update({
        where: { id: stateThresholdId },
        data: {
          lastVerifiedDate: now,
          lastVerifiedBy: "AI_SCRAPE",
          nextReviewDue: nextReview,
          dataConfidenceLevel: "VERIFIED",
        },
      });
      return { status: "verified", flagCreated: false };
    });
  },
);
