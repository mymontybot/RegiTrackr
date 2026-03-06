"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import { invalidateAllNarratives } from "@/lib/redis/client";
import { inngest } from "@/inngest/client";

function getAdminEmail(): string | null {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? null;
}

async function assertAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const clerkUser = await currentUser();
  const primaryEmail =
    clerkUser?.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    "";
  const normalized = primaryEmail.trim().toLowerCase();
  const adminEmail = getAdminEmail();
  if (!adminEmail || normalized !== adminEmail) {
    throw new Error("Forbidden");
  }
  return userId;
}

export async function markFlagNoChange(flagId: string): Promise<{ error?: string }> {
  try {
    await assertAdmin();
  } catch {
    return { error: "Forbidden" };
  }
  const flag = await prisma.thresholdChangeFlag.findUnique({
    where: { id: flagId },
    select: { stateThresholdId: true },
  });
  if (!flag) return { error: "Flag not found" };
  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + 90);
  await prisma.$transaction([
    prisma.thresholdChangeFlag.update({
      where: { id: flagId },
      data: { status: "REVIEWED_NO_CHANGE", reviewedAt: now },
    }),
    prisma.stateThreshold.update({
      where: { id: flag.stateThresholdId },
      data: {
        lastVerifiedAt: now,
        lastVerifiedDate: now,
        lastVerifiedBy: "MANUAL",
        nextReviewDue: nextReview,
        dataConfidence: "HIGH",
        dataConfidenceLevel: "VERIFIED",
      },
    }),
  ]);
  revalidatePath("/threshold-flags");
  return {};
}

export async function markFlagDismissed(flagId: string, note: string): Promise<{ error?: string }> {
  try {
    await assertAdmin();
  } catch {
    return { error: "Forbidden" };
  }
  const trimmed = note?.trim();
  if (!trimmed) return { error: "A note is required when dismissing." };
  await prisma.thresholdChangeFlag.update({
    where: { id: flagId },
    data: { status: "DISMISSED", reviewedAt: new Date(), reviewNote: trimmed },
  });
  revalidatePath("/threshold-flags");
  return {};
}

export async function updateThresholdAndFlag(
  flagId: string,
  stateThresholdId: string,
  data: {
    salesThreshold: number;
    transactionThreshold: number | null;
    measurementPeriod: string;
    effectiveDate: string;
    sourceUrl: string;
    source_url: string | null;
    notes: string | null;
  },
): Promise<{ error?: string }> {
  let userId: string;
  try {
    userId = await assertAdmin();
  } catch {
    return { error: "Forbidden" };
  }
  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + 90);
  await prisma.$transaction([
    prisma.stateThreshold.update({
      where: { id: stateThresholdId },
      data: {
        salesThreshold: data.salesThreshold,
        transactionThreshold: data.transactionThreshold,
        measurementPeriod: data.measurementPeriod as "CALENDAR_YEAR" | "ROLLING_12_MONTHS" | "PRIOR_YEAR",
        effectiveDate: new Date(data.effectiveDate),
        sourceUrl: data.sourceUrl,
        source_url: data.source_url || null,
        notes: data.notes,
        dataConfidenceLevel: "VERIFIED",
        lastVerifiedAt: now,
        lastVerifiedDate: now,
        lastVerifiedBy: userId,
        nextReviewDue: nextReview,
      },
    }),
    prisma.thresholdChangeFlag.update({
      where: { id: flagId },
      data: { status: "UPDATED", reviewedAt: now },
    }),
  ]);
  await invalidateAllNarratives();
  revalidatePath("/threshold-flags");
  return {};
}

export async function triggerMonitorState(
  stateCode: string,
  stateThresholdId: string,
  sourceUrl: string,
): Promise<{ error?: string }> {
  try {
    await assertAdmin();
  } catch {
    return { error: "Forbidden" };
  }
  await inngest.send({
    name: "regitrackr/threshold.monitor-state",
    data: { stateCode, stateThresholdId, sourceUrl },
  });
  revalidatePath("/threshold-flags");
  return {};
}
