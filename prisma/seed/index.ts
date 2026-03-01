import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { seedStateThresholds } from "./state_thresholds";
import { seedStateFilingRules } from "./state_filing_rules";
import { seedPublicHolidays } from "./public_holidays";
import { seedDevFixtures } from "./dev_fixtures";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Missing DATABASE_URL for seed runner");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const thresholdCount = await seedStateThresholds(prisma);
  console.log(`[seed] StateThreshold rows created: ${thresholdCount}`);

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
