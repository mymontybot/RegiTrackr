import { Resend } from "resend";
import prisma from "@/lib/db/prisma";
import { DeadlineService } from "@/lib/services/deadline.service";
import { log } from "@/lib/utils/logger";
import { inngest } from "@/inngest/client";

const DAILY_REMINDER_FROM = "reminders@regitrackr.app";
const WEEKLY_DIGEST_FROM = "digest@regitrackr.app";

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getReminderSubject(clientName: string, stateCode: string, dueDate: Date) {
  return `Filing reminder: ${clientName} ${stateCode} due ${formatDate(dueDate)}`;
}

function getWeeklyDigestSubject(firmName: string) {
  return `Weekly filing digest: ${firmName}`;
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function getFirmRecipients(firmId: string): Promise<string[]> {
  const [firm, admins] = await Promise.all([
    prisma.firm.findUnique({
      where: { id: firmId },
      select: { supportEmail: true },
    }),
    prisma.user.findMany({
      where: { firmId, role: "FIRM_ADMIN" },
      select: { email: true },
    }),
  ]);

  const recipients = new Set<string>();
  if (firm?.supportEmail) recipients.add(firm.supportEmail);
  for (const admin of admins) {
    if (admin.email) recipients.add(admin.email);
  }
  return Array.from(recipients);
}

export const reminderDispatchJob = inngest.createFunction(
  {
    id: "reminder-dispatch-daily",
    retries: 3,
  },
  { cron: "0 12 * * *" },
  async ({ step }) => {
    return step.run("dispatch-reminders", async () => {
      try {
        log("info", "reminder dispatch job started", {
          service: "ReminderDispatchJob",
          jobName: "reminder-dispatch",
        });

        const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
        const firms = await prisma.firm.findMany({
          select: {
            id: true,
            name: true,
            billingTier: true,
          },
        });

        let remindersFound = 0;
        let notificationsCreated = 0;
        let emailsSent = 0;
        let weeklyDigestsSent = 0;
        let errors = 0;

        for (const firm of firms) {
          try {
            const recipients = await getFirmRecipients(firm.id);
            if (recipients.length === 0) continue;

            const deadlineService = new DeadlineService({
              firmId: firm.id,
              userId: "inngest-system",
              billingTier: firm.billingTier,
            });
            const reminders = await deadlineService.getRemindersDueToday(firm.id);
            remindersFound += reminders.length;

            if (reminders.length > 0) {
              const filingIds = reminders.map((item) => item.filingRecordId);
              const filings = await prisma.filingRecord.findMany({
                where: { id: { in: filingIds } },
                select: {
                  id: true,
                  stateCode: true,
                  dueDate: true,
                  status: true,
                  periodYear: true,
                  periodMonth: true,
                  periodQuarter: true,
                  entityId: true,
                  entity: {
                    select: {
                      id: true,
                      name: true,
                      client: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              });
              const filingsById = new Map(filings.map((filing) => [filing.id, filing]));

              for (const reminder of reminders) {
                try {
                  const filing = filingsById.get(reminder.filingRecordId);
                  if (!filing) continue;

                  const period = filing.periodQuarter
                    ? `${filing.periodYear} Q${filing.periodQuarter}`
                    : `${filing.periodYear}-${String(filing.periodMonth ?? 0).padStart(2, "0")}`;
                  const directLink = `${getAppBaseUrl()}/dashboard/calendar?filingId=${filing.id}`;
                  const subject = getReminderSubject(filing.entity.client.name, filing.stateCode, filing.dueDate);
                  const text = [
                    `Client: ${filing.entity.client.name}`,
                    `Entity: ${filing.entity.name}`,
                    `State: ${filing.stateCode}`,
                    `Due date: ${formatDate(filing.dueDate)}`,
                    `Filing period: ${period}`,
                    `Current status: ${filing.status}`,
                    `Open filing: ${directLink}`,
                  ].join("\n");
                  for (const recipient of recipients) {
                    const dedupeKey = [
                      "FILING_REMINDER",
                      firm.id,
                      filing.id,
                      reminder.daysUntilDue,
                      recipient.toLowerCase(),
                      dayKey(),
                    ].join(":");

                    const created = await prisma.notification.createMany({
                      data: [
                        {
                          firmId: firm.id,
                          clientId: filing.entity.client.id,
                          entityId: filing.entityId,
                          filingRecordId: filing.id,
                          notificationType: "FILING_REMINDER",
                          dedupeKey,
                          channel: "EMAIL",
                          recipientEmail: recipient,
                          subject,
                          payload: {
                            stateCode: filing.stateCode,
                            dueDate: filing.dueDate.toISOString(),
                            filingPeriod: period,
                            status: filing.status,
                            directLink,
                            daysUntilDue: reminder.daysUntilDue,
                          },
                          status: resend ? "SENT" : "SKIPPED_NO_RESEND_KEY",
                          sentAt: resend ? new Date() : null,
                        },
                      ],
                      skipDuplicates: true,
                    });
                    if (created.count === 0) {
                      continue;
                    }

                    notificationsCreated += 1;
                    if (resend) {
                      await resend.emails.send({
                        from: DAILY_REMINDER_FROM,
                        to: recipient,
                        subject,
                        text,
                      });
                      emailsSent += 1;
                    }
                  }
                } catch (error) {
                  errors += 1;
                  log("error", "reminder dispatch failed for filing", {
                    firmId: firm.id,
                    service: "ReminderDispatchJob",
                    jobName: "reminder-dispatch",
                    error,
                  });
                }
              }
            }

            const isMonday = new Date().getUTCDay() === 1;
            if (isMonday) {
              const next14 = await deadlineService.getUpcomingFilings(firm.id, 14);
              const digestLines = next14
                .slice(0, 25)
                .map((filing) => {
                  const period = filing.periodQuarter
                    ? `${filing.periodYear} Q${filing.periodQuarter}`
                    : `${filing.periodYear}-${String(filing.periodMonth ?? 0).padStart(2, "0")}`;
                  return `- ${filing.stateCode} ${period} due ${formatDate(filing.dueDate)} (${filing.status})`;
                });
              const digestText = [
                `Next 14 days filing digest for ${firm.name}:`,
                "",
                ...digestLines,
                "",
                `Total upcoming filings: ${next14.length}`,
              ].join("\n");
              const digestSubject = getWeeklyDigestSubject(firm.name);

              for (const recipient of recipients) {
                const dedupeKey = [
                  "WEEKLY_DIGEST",
                  firm.id,
                  recipient.toLowerCase(),
                  dayKey(),
                ].join(":");
                const created = await prisma.notification.createMany({
                  data: [
                    {
                      firmId: firm.id,
                      notificationType: "WEEKLY_DIGEST",
                      dedupeKey,
                      channel: "EMAIL",
                      recipientEmail: recipient,
                      subject: digestSubject,
                      payload: {
                        lookaheadDays: 14,
                        filingCount: next14.length,
                      },
                      status: resend ? "SENT" : "SKIPPED_NO_RESEND_KEY",
                      sentAt: resend ? new Date() : null,
                    },
                  ],
                  skipDuplicates: true,
                });
                if (created.count === 0) {
                  continue;
                }

                notificationsCreated += 1;
                if (resend) {
                  await resend.emails.send({
                    from: WEEKLY_DIGEST_FROM,
                    to: recipient,
                    subject: digestSubject,
                    text: digestText,
                  });
                  weeklyDigestsSent += 1;
                }
              }
            }
          } catch (error) {
            errors += 1;
            log("error", "reminder dispatch failed for firm", {
              firmId: firm.id,
              service: "ReminderDispatchJob",
              jobName: "reminder-dispatch",
              error,
            });
          }
        }

        const payload = {
          remindersFound,
          notificationsCreated,
          emailsSent,
          weeklyDigestsSent,
          errors,
        };
        log("info", "reminder dispatch job completed", {
          service: "ReminderDispatchJob",
          jobName: "reminder-dispatch",
        });
        return payload;
      } catch (error) {
        log("error", "reminder dispatch job failed", {
          service: "ReminderDispatchJob",
          jobName: "reminder-dispatch",
          error,
        });
        throw error;
      }
    });
  },
);
