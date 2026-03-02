import prisma from "@/lib/db/prisma";
import { generateFilingSchedule, type PublicHoliday, type StateFilingRule } from "@/lib/engines/deadline.engine";
import { DeadlineService } from "@/lib/services/deadline.service";
import { log } from "@/lib/utils/logger";
import { inngest } from "@/inngest/client";

type RuleKey = `${string}:${string}`;

function getRuleKey(stateCode: string, filingFrequency: string) {
  return `${stateCode}:${filingFrequency}` as RuleKey;
}

export const deadlineRefreshJob = inngest.createFunction(
  {
    id: "deadline-refresh-nightly",
    retries: 3,
  },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    return step.run("refresh-deadlines", async () => {
      try {
        log("info", "deadline refresh job started", {
          service: "DeadlineRefreshJob",
          jobName: "deadline-refresh",
        });
        const now = new Date();

        const [registrations, rules, holidays, firms] = await Promise.all([
          prisma.nexusRegistration.findMany({
            where: {
              status: "REGISTERED",
            },
            select: {
              entityId: true,
              firmId: true,
              stateCode: true,
              status: true,
              filingFrequency: true,
              registrationDate: true,
            },
          }),
          prisma.stateFilingRule.findMany({
            where: { version: 1 },
            select: {
              stateCode: true,
              filingFrequency: true,
              dueDateDaysAfterPeriod: true,
            },
          }),
          prisma.publicHoliday.findMany({
            select: {
              stateCode: true,
              date: true,
              name: true,
              year: true,
            },
          }),
          prisma.firm.findMany({
            select: {
              id: true,
              billingTier: true,
            },
          }),
        ]);

        const rulesByKey = new Map<RuleKey, StateFilingRule>();
        for (const rule of rules) {
          rulesByKey.set(
            getRuleKey(rule.stateCode, rule.filingFrequency),
            {
              stateCode: rule.stateCode,
              filingFrequency: rule.filingFrequency,
              dueDateDaysAfterPeriod: rule.dueDateDaysAfterPeriod,
            },
          );
        }

        const publicHolidays: PublicHoliday[] = holidays.map((holiday) => ({
          stateCode: holiday.stateCode,
          date: holiday.date,
          name: holiday.name,
          year: holiday.year,
        }));

        let filingsCreated = 0;
        let overdueMarked = 0;
        let overdueAlerts = 0;
        let errors = 0;

        for (const registration of registrations) {
          try {
            const filingFrequency = registration.filingFrequency ?? "MONTHLY";
            const rule =
              rulesByKey.get(getRuleKey(registration.stateCode, filingFrequency)) ??
              rulesByKey.get(getRuleKey(registration.stateCode, "MONTHLY"));
            if (!rule) continue;

            const generated = generateFilingSchedule({
              nexusRegistration: {
                entityId: registration.entityId,
                firmId: registration.firmId,
                stateCode: registration.stateCode,
                status: registration.status,
                filingFrequency: registration.filingFrequency,
                registrationDate: registration.registrationDate,
              },
              stateFilingRule: rule,
              publicHolidays,
              generateMonthsAhead: 12,
              asOfDate: now,
            });

            for (const item of generated) {
              const existing = await prisma.filingRecord.findFirst({
                where: {
                  entityId: item.entityId,
                  firmId: item.firmId,
                  stateCode: item.stateCode,
                  periodYear: item.periodYear,
                  periodMonth: item.periodMonth,
                  periodQuarter: item.periodQuarter,
                },
                select: { id: true },
              });
              if (existing) continue;

              await prisma.filingRecord.create({
                data: {
                  entityId: item.entityId,
                  firmId: item.firmId,
                  stateCode: item.stateCode,
                  periodYear: item.periodYear,
                  periodMonth: item.periodMonth,
                  periodQuarter: item.periodQuarter,
                  dueDate: item.adjustedDueDate,
                  status: "UPCOMING",
                  assignedUserId: null,
                },
              });
              filingsCreated += 1;
            }
          } catch (error) {
            errors += 1;
            log("error", "deadline registration processing failed", {
              firmId: registration.firmId,
              entityId: registration.entityId,
              service: "DeadlineRefreshJob",
              jobName: "deadline-refresh",
              error,
            });
          }
        }

        for (const firm of firms) {
          try {
            const deadlineService = new DeadlineService({
              firmId: firm.id,
              userId: "inngest-system",
              billingTier: firm.billingTier,
            });
            const result = await deadlineService.detectAndMarkOverdue();
            overdueMarked += result.updatedCount;
            overdueAlerts += result.alerts.length;
          } catch (error) {
            errors += 1;
            log("error", "detect overdue failed", {
              firmId: firm.id,
              service: "DeadlineRefreshJob",
              jobName: "deadline-refresh",
              error,
            });
          }
        }

        const payload = {
          filingsCreated,
          overdueMarked,
          overdueAlerts,
          errors,
        };
        log("info", "deadline refresh job completed", {
          service: "DeadlineRefreshJob",
          jobName: "deadline-refresh",
        });
        return payload;
      } catch (error) {
        log("error", "deadline refresh job failed", {
          service: "DeadlineRefreshJob",
          jobName: "deadline-refresh",
          error,
        });
        throw error;
      }
    });
  },
);
