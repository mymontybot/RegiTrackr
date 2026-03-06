import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { ThresholdFlagsClient } from "@/components/admin/ThresholdFlagsClient";

function forbidden() {
  throw new NextResponse(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

const CRON_DESCRIPTION = "3am UTC every Monday";

function startOfThisWeekUTC(): Date {
  const d = new Date();
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default async function ThresholdFlagsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  const primaryEmail =
    clerkUser?.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    "";
  const normalizedEmail = primaryEmail.trim().toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? null;

  if (!adminEmail || normalizedEmail !== adminEmail) {
    forbidden();
  }

  const startOfWeek = startOfThisWeekUTC();

  const [
    pendingFlags,
    allThresholds,
    pendingCount,
    reviewedThisWeekCount,
    statesWithNoSourceUrlCount,
  ] = await Promise.all([
    prisma.thresholdChangeFlag.findMany({
      where: { status: "PENDING" },
      include: { stateThreshold: true },
      orderBy: { detectedAt: "desc" },
    }),
    prisma.stateThreshold.findMany({
      orderBy: [{ stateCode: "asc" }, { version: "desc" }],
    }),
    prisma.thresholdChangeFlag.count({ where: { status: "PENDING" } }),
    prisma.thresholdChangeFlag.count({
      where: {
        status: { in: ["REVIEWED_NO_CHANGE", "UPDATED", "DISMISSED"] },
        reviewedAt: { gte: startOfWeek },
      },
    }),
    prisma.stateThreshold.count({ where: { source_url: null } }),
  ]);

  const latestByState = new Map<string, (typeof allThresholds)[0]>();
  for (const t of allThresholds) {
    if (!latestByState.has(t.stateCode)) latestByState.set(t.stateCode, t);
  }
  const allStatesRows = Array.from(latestByState.values());

  return (
    <div className="min-h-screen bg-[#060B18]">
      <div className="border-b border-[#1E2D4A] px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Threshold Change Flags
        </h1>
      </div>
      <div className="p-6">
        <ThresholdFlagsClient
          pendingFlags={pendingFlags}
          allStates={allStatesRows}
          pendingCount={pendingCount}
          reviewedThisWeekCount={reviewedThisWeekCount}
          statesWithNoSourceUrlCount={statesWithNoSourceUrlCount}
          nextScheduledRun={CRON_DESCRIPTION}
        />
      </div>
    </div>
  );
}
