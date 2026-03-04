import { hash } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

type ThresholdMap = Map<string, number>;

function getRequiredThreshold(thresholds: ThresholdMap, stateCode: string): number {
  const threshold = thresholds.get(stateCode);
  if (!threshold || threshold <= 0) {
    throw new Error(`Missing positive sales threshold for state ${stateCode}`);
  }
  return threshold;
}

function toCentsFromThreshold(threshold: number, percentage: number): number {
  return Math.round(threshold * percentage);
}

function monthOffset(base: Date, offset: number): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
}

export async function seedDevFixtures(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Dev seed only");
  }

  await prisma.firm.deleteMany({ where: { slug: "hartwell-cpa" } });

  const thresholds = await prisma.stateThreshold.findMany({
    where: { version: 1, stateCode: { in: ["CA", "TX", "NY", "FL", "WA", "IL", "PA", "OH", "GA"] } },
    select: { stateCode: true, salesThreshold: true },
  });

  const thresholdMap: ThresholdMap = new Map(
    thresholds.map((row) => [row.stateCode, Number(row.salesThreshold)]),
  );

  const firm = await prisma.firm.create({
    data: {
      name: "Hartwell & Associates CPA",
      slug: "hartwell-cpa",
      billingTier: "GROWTH",
      billingStatus: "ACTIVE",
      activeClientCount: 0,
      pricePerClient: 2000,
      monthlyFloor: 9900,
      logoUrl: "https://placehold.co/200x60?text=Hartwell+CPA",
      timezone: "America/New_York",
      supportEmail: "ops@hartwellcpa.dev",
    },
  });

  const sarah = await prisma.user.create({
    data: {
      clerkUserId: "dev_sarah_chen",
      firmId: firm.id,
      email: "sarah.chen@hartwellcpa.dev",
      name: "Sarah Chen",
      role: "FIRM_ADMIN",
    },
  });

  const james = await prisma.user.create({
    data: {
      clerkUserId: "dev_james_okafor",
      firmId: firm.id,
      email: "james.okafor@hartwellcpa.dev",
      name: "James Okafor",
      role: "STAFF_ACCOUNTANT",
    },
  });

  // Client A: Meridian Digital LLC
  const meridianClient = await prisma.client.create({
    data: {
      firmId: firm.id,
      name: "Meridian Digital LLC",
      industry: "Digital Services",
    },
  });

  const meridianEntity = await prisma.entity.create({
    data: {
      firmId: firm.id,
      clientId: meridianClient.id,
      name: "Meridian Digital LLC",
      entityType: "LLC",
      ein: "dev-encrypted-ein-meridian",
    },
  });

  // Client B: Blue Ridge Holdings Inc
  const blueRidgeClient = await prisma.client.create({
    data: {
      firmId: firm.id,
      name: "Blue Ridge Holdings Inc",
      industry: "Holdings",
    },
  });

  const blueRidgeOps = await prisma.entity.create({
    data: {
      firmId: firm.id,
      clientId: blueRidgeClient.id,
      name: "Blue Ridge Operations LLC",
      entityType: "LLC",
      ein: "dev-encrypted-ein-blue-ridge-ops",
    },
  });

  const blueRidgeProps = await prisma.entity.create({
    data: {
      firmId: firm.id,
      clientId: blueRidgeClient.id,
      name: "Blue Ridge Properties LLC",
      entityType: "LLC",
      ein: "dev-encrypted-ein-blue-ridge-props",
    },
  });

  // Client C: Clearwater SaaS Inc
  const clearwaterClient = await prisma.client.create({
    data: {
      firmId: firm.id,
      name: "Clearwater SaaS Inc",
      industry: "SaaS",
    },
  });

  const clearwaterEntity = await prisma.entity.create({
    data: {
      firmId: firm.id,
      clientId: clearwaterClient.id,
      name: "Clearwater SaaS Inc",
      entityType: "C_CORP",
      ein: "dev-encrypted-ein-clearwater",
    },
  });

  const now = new Date();
  const periodYear = now.getUTCFullYear();
  const periodMonth = now.getUTCMonth() + 1;

  await prisma.revenueEntry.createMany({
    data: [
      // Meridian Digital nexus bands
      {
        entityId: meridianEntity.id,
        firmId: firm.id,
        stateCode: "CA",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "CA"), 0.94),
        transactionCount: 120,
        source: "MANUAL",
        enteredByUserId: sarah.id,
      },
      {
        entityId: meridianEntity.id,
        firmId: firm.id,
        stateCode: "TX",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "TX"), 1.08),
        transactionCount: 160,
        source: "MANUAL",
        enteredByUserId: sarah.id,
      },
      {
        entityId: meridianEntity.id,
        firmId: firm.id,
        stateCode: "NY",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "NY"), 0.45),
        transactionCount: 40,
        source: "MANUAL",
        enteredByUserId: sarah.id,
      },
      {
        entityId: meridianEntity.id,
        firmId: firm.id,
        stateCode: "FL",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "FL"), 0.72),
        transactionCount: 95,
        source: "MANUAL",
        enteredByUserId: sarah.id,
      },
      {
        entityId: meridianEntity.id,
        firmId: firm.id,
        stateCode: "WA",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "WA"), 1.1),
        transactionCount: 135,
        source: "MANUAL",
        enteredByUserId: sarah.id,
      },
      // Blue Ridge moderate activity near warning
      {
        entityId: blueRidgeOps.id,
        firmId: firm.id,
        stateCode: "IL",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "IL"), 0.78),
        transactionCount: 80,
        source: "MANUAL",
        enteredByUserId: james.id,
      },
      {
        entityId: blueRidgeOps.id,
        firmId: firm.id,
        stateCode: "PA",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "PA"), 0.82),
        transactionCount: 84,
        source: "MANUAL",
        enteredByUserId: james.id,
      },
      {
        entityId: blueRidgeProps.id,
        firmId: firm.id,
        stateCode: "OH",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "OH"), 0.69),
        transactionCount: 78,
        source: "MANUAL",
        enteredByUserId: james.id,
      },
      {
        entityId: blueRidgeProps.id,
        firmId: firm.id,
        stateCode: "GA",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "GA"), 0.74),
        transactionCount: 82,
        source: "MANUAL",
        enteredByUserId: james.id,
      },
      // Clearwater all safe
      {
        entityId: clearwaterEntity.id,
        firmId: firm.id,
        stateCode: "CA",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "CA"), 0.18),
        transactionCount: 20,
        source: "MANUAL",
        enteredByUserId: sarah.id,
      },
      {
        entityId: clearwaterEntity.id,
        firmId: firm.id,
        stateCode: "TX",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "TX"), 0.12),
        transactionCount: 14,
        source: "MANUAL",
        enteredByUserId: sarah.id,
      },
      {
        entityId: clearwaterEntity.id,
        firmId: firm.id,
        stateCode: "FL",
        periodYear,
        periodMonth,
        amount: toCentsFromThreshold(getRequiredThreshold(thresholdMap, "FL"), 0.15),
        transactionCount: 18,
        source: "MANUAL",
        enteredByUserId: sarah.id,
      },
    ],
  });

  // Washington registration for Meridian (REGISTERED)
  const waRegistration = await prisma.nexusRegistration.create({
    data: {
      entityId: meridianEntity.id,
      firmId: firm.id,
      stateCode: "WA",
      status: "REGISTERED",
      registrationDate: monthOffset(now, -2),
      filingFrequency: "MONTHLY",
      stateAccountNumber: "dev-encrypted-wa-account",
      notes: "Dev fixture registration",
    },
  });

  const assigneeByEntityId = new Map<string, string>([
    [meridianEntity.id, sarah.id],
    [blueRidgeOps.id, james.id],
    [blueRidgeProps.id, james.id],
    [clearwaterEntity.id, sarah.id],
  ]);

  const activeRegistrations = await prisma.nexusRegistration.findMany({
    where: { firmId: firm.id, status: "REGISTERED" },
  });

  for (const registration of activeRegistrations) {
    for (let i = 0; i < 6; i += 1) {
      const period = monthOffset(now, i);
      const due = new Date(
        Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 20),
      );

      await prisma.filingRecord.create({
        data: {
          entityId: registration.entityId,
          firmId: firm.id,
          stateCode: registration.stateCode,
          periodYear: period.getUTCFullYear(),
          periodMonth: period.getUTCMonth() + 1,
          periodQuarter: null,
          dueDate: due,
          status: "UPCOMING",
          assignedUserId: assigneeByEntityId.get(registration.entityId) ?? sarah.id,
        },
      });
    }
  }

  await prisma.alert.createMany({
    data: [
      {
        entityId: meridianEntity.id,
        firmId: firm.id,
        stateCode: "TX",
        alertType: "TRIGGERED_NOT_REGISTERED",
        band: "TRIGGERED",
        periodKey: `${periodYear}`,
        isRead: false,
        isSnoozed: false,
      },
      {
        entityId: meridianEntity.id,
        firmId: firm.id,
        stateCode: "CA",
        alertType: "URGENT_90",
        band: "URGENT",
        periodKey: `${periodYear}`,
        isRead: false,
        isSnoozed: false,
      },
    ],
  });

  const passwordHash = await hash("TestPortal123!", 10);
  await prisma.portalUser.create({
    data: {
      email: "accounts@meridiandigital.com",
      firmId: firm.id,
      clientId: meridianClient.id,
      passwordHash,
      canSubmitRevenue: true,
      isActive: true,
    },
  });

  await prisma.firm.update({
    where: { id: firm.id },
    data: {
      activeClientCount: 3,
      billingTier: "GROWTH",
      billingStatus: "ACTIVE",
      pricePerClient: 2000,
      monthlyFloor: 9900,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
    },
  });

  // Reference variable to avoid unused lint in future fixture changes.
  if (!waRegistration.id) {
    throw new Error("Failed to create Washington registration fixture");
  }

  // Optional: link your Clerk user to the fixture firm so you see this data when you log in.
  const linkClerkId = process.env.SEED_LINK_CLERK_USER_ID?.trim();
  if (linkClerkId) {
    const existing = await prisma.user.findUnique({ where: { clerkUserId: linkClerkId } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { firmId: firm.id, role: "FIRM_ADMIN" },
      });
      console.log(`[seed] Linked Clerk user ${linkClerkId} to Hartwell firm — you will see fixture data when you log in.`);
    } else {
      await prisma.user.create({
        data: {
          clerkUserId: linkClerkId,
          firmId: firm.id,
          email: "you@example.com",
          name: "Dev User",
          role: "FIRM_ADMIN",
        },
      });
      console.log(`[seed] Created User for Clerk ${linkClerkId} in Hartwell firm — log in with that account to see fixture data.`);
    }
  } else {
    console.log("[seed] To see this data in the app, add SEED_LINK_CLERK_USER_ID=your_clerk_user_id to your .env file and run the seed again.");
  }

  console.log("Dev fixtures created — Hartwell & Associates CPA with 3 clients");
}
