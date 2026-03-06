import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { seedStateThresholds } from "./state_thresholds";
import { seedStateFilingRules } from "./state_filing_rules";
import { seedPublicHolidays } from "./public_holidays";
import { seedDevFixtures } from "./dev_fixtures";

const rawConnectionString = process.env.DATABASE_URL;
if (!rawConnectionString) {
  throw new Error("Missing DATABASE_URL for seed runner");
}

// Strip sslmode/uselibpqcompat from the URL so the pg library doesn't override
// our explicit ssl config. pg-connection-string now treats sslmode=require as
// verify-full which fails against Supabase's pooler cert chain on macOS.
const connUrl = new URL(rawConnectionString);
connUrl.searchParams.delete("sslmode");
connUrl.searchParams.delete("uselibpqcompat");
const connectionString = connUrl.toString();

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function backfillThresholdVerificationDates(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + 90);
  const result = await prisma.stateThreshold.updateMany({
    data: {
      lastVerifiedDate: now,
      lastVerifiedBy: "MANUAL",
      nextReviewDue: nextReview,
    },
  });
  return result.count;
}

async function main() {
  const thresholdCount = await seedStateThresholds(prisma);
  console.log(`[seed] StateThreshold rows created: ${thresholdCount}`);

  const backfillCount = await backfillThresholdVerificationDates(prisma);
  console.log(`[seed] StateThreshold verification dates backfilled: ${backfillCount}`);

  const filingRuleCount = await seedStateFilingRules(prisma);
  console.log(`[seed] StateFilingRule rows created: ${filingRuleCount}`);

  const holidayCount = await seedPublicHolidays(prisma);
  console.log(`[seed] PublicHoliday rows created: ${holidayCount}`);

  if (process.env.NODE_ENV === "development") {
    await seedDevFixtures(prisma);
  }
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
