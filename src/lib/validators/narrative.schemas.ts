import { z } from "zod";

export const NARRATIVE_DISCLAIMER =
  "This summary is generated from data in RegiTrackr and does not constitute tax advice. Verify all thresholds and deadlines with official state sources before taking action.";

export const nexusResultSchema = z.object({
  stateCode: z.string(),
  stateName: z.string(),
  totalRevenue: z.number(),
  revenueThreshold: z.number().nullable(),
  percentOfRevenue: z.number(),
  totalTransactions: z.number(),
  transactionThreshold: z.number().nullable(),
  percentOfTransactions: z.number(),
  controllingPercent: z.number(),
  band: z.enum(["SAFE", "WARNING", "URGENT", "TRIGGERED", "REGISTERED"]),
  dataQualityFlags: z.array(z.string()),
});

export const narrativeInputSchema = z.object({
  entityName: z.string(),
  entityType: z.string(),
  nexusResults: z.array(nexusResultSchema),
  upcomingDeadlines: z.array(
    z.object({
      stateCode: z.string(),
      dueDate: z.string(),
      filingPeriod: z.string(),
      status: z.string(),
    }),
  ),
  overdueFilings: z.array(
    z.object({
      stateCode: z.string(),
      dueDate: z.string(),
      filingPeriod: z.string(),
    }),
  ),
  dataQualityFlags: z.array(z.string()),
  velocityData: z
    .array(
      z.object({
        stateCode: z.string(),
        trailing60DayMonthlyAvg: z.number().nullable(),
        estimatedDaysToThreshold: z.number().nullable(),
      }),
    )
    .optional(),
  activeAlertCount: z.number(),
  alertsBySeverity: z.object({
    warning: z.number(),
    urgent: z.number(),
    triggered: z.number(),
  }),
});

export const narrativeOutputSchema = z.object({
  success: z.literal(true),
  summaryText: z.string(),
  highlights: z.tuple([z.string(), z.string(), z.string()]),
  dataQualityFlags: z.array(z.string()),
  disclaimer: z.literal(NARRATIVE_DISCLAIMER),
  generatedAt: z.string(),
  modelId: z.string(),
  cached: z.boolean(),
});

export const narrativeErrorResponseSchema = z.object({
  success: z.literal(false),
});

export type NarrativeInput = z.infer<typeof narrativeInputSchema>;
export type NarrativeOutput = z.infer<typeof narrativeOutputSchema>;
