import { describe, expect, it } from "vitest";
import {
  calculateNexus,
  type NexusEngineInput,
  type NexusRegistration,
  type RevenueEntry,
  type StateThreshold,
} from "./nexus.engine";

const AS_OF_DATE = new Date("2026-05-15T00:00:00.000Z");

function makeRevenueEntry(
  stateCode: string,
  periodYear: number,
  periodMonth: number,
  amount: number,
  transactionCount = 0,
): RevenueEntry {
  return {
    entityId: "entity-1",
    stateCode,
    periodYear,
    periodMonth,
    amount,
    transactionCount,
  };
}

function makeThreshold(
  stateCode: string,
  measurementPeriod: StateThreshold["measurementPeriod"],
  salesThreshold = 100_000,
  transactionThreshold: number | null = null,
): StateThreshold {
  return {
    stateCode,
    stateName: stateCode,
    salesThreshold,
    transactionThreshold,
    measurementPeriod,
  };
}

function runEngine(overrides: Partial<NexusEngineInput>) {
  const input: NexusEngineInput = {
    entityId: "entity-1",
    firmId: "firm-1",
    revenueEntries: [],
    stateThresholds: [],
    registrations: [],
    asOfDate: AS_OF_DATE,
    ...overrides,
  };
  return calculateNexus(input);
}

describe("nexus engine", () => {
  it("1) entity at 65% -> Safe, no alert", () => {
    const output = runEngine({
      stateThresholds: [makeThreshold("CA", "CALENDAR_YEAR")],
      revenueEntries: [makeRevenueEntry("CA", 2026, 5, 65_000)],
    });

    expect(output.results[0].band).toBe("SAFE");
    expect(output.results[0].controllingPercent).toBe(65);
    expect(output.alerts).toHaveLength(0);
  });

  it("2) entity at 75% -> Warning, warning alert generated", () => {
    const output = runEngine({
      stateThresholds: [makeThreshold("CA", "CALENDAR_YEAR")],
      revenueEntries: [makeRevenueEntry("CA", 2026, 5, 75_000)],
    });

    expect(output.results[0].band).toBe("WARNING");
    expect(output.alerts).toHaveLength(1);
    expect(output.alerts[0].alertType).toBe("WARNING_70");
  });

  it("3) entity at 92% -> Urgent, urgent alert generated", () => {
    const output = runEngine({
      stateThresholds: [makeThreshold("TX", "CALENDAR_YEAR")],
      revenueEntries: [makeRevenueEntry("TX", 2026, 5, 92_000)],
    });

    expect(output.results[0].band).toBe("URGENT");
    expect(output.alerts).toHaveLength(1);
    expect(output.alerts[0].alertType).toBe("URGENT_90");
  });

  it("4) entity at 105%, not registered -> Triggered + TRIGGERED_NOT_REGISTERED alert", () => {
    const output = runEngine({
      stateThresholds: [makeThreshold("TX", "CALENDAR_YEAR")],
      revenueEntries: [makeRevenueEntry("TX", 2026, 5, 105_000)],
    });

    expect(output.results[0].band).toBe("TRIGGERED");
    expect(output.alerts.map((a) => a.alertType).sort()).toEqual([
      "TRIGGERED_100",
      "TRIGGERED_NOT_REGISTERED",
    ]);
  });

  it("5) entity at 105%, has REGISTERED status -> Registered band", () => {
    const registrations: NexusRegistration[] = [
      { entityId: "entity-1", stateCode: "TX", status: "REGISTERED" },
    ];

    const output = runEngine({
      stateThresholds: [makeThreshold("TX", "CALENDAR_YEAR")],
      revenueEntries: [makeRevenueEntry("TX", 2026, 5, 105_000)],
      registrations,
    });

    expect(output.results[0].band).toBe("REGISTERED");
    expect(output.results[0].isRegistered).toBe(true);
    expect(output.alerts).toHaveLength(0);
  });

  it("6) entity with 2 months missing -> dataQualityFlags include both months", () => {
    const output = runEngine({
      stateThresholds: [makeThreshold("FL", "CALENDAR_YEAR")],
      revenueEntries: [
        makeRevenueEntry("FL", 2026, 1, 20_000),
        makeRevenueEntry("FL", 2026, 4, 15_000),
      ],
    });

    expect(output.results[0].band).toBe("SAFE");
    expect(output.results[0].dataQualityFlags).toContain("Missing revenue data for February 2026");
    expect(output.results[0].dataQualityFlags).toContain("Missing revenue data for March 2026");
  });

  it("7) idempotency: running engine twice does not double alerts", () => {
    const args: Partial<NexusEngineInput> = {
      stateThresholds: [makeThreshold("GA", "CALENDAR_YEAR")],
      revenueEntries: [makeRevenueEntry("GA", 2026, 5, 105_000)],
    };

    const first = runEngine(args);
    const second = runEngine(args);

    expect(first.alerts.map((a) => a.dedupeKey).sort()).toEqual(
      second.alerts.map((a) => a.dedupeKey).sort(),
    );
    expect(new Set(first.alerts.map((a) => a.dedupeKey)).size).toBe(first.alerts.length);
  });

  it("8) velocity calculation correct with 2 completed months of data", () => {
    const output = runEngine({
      stateThresholds: [makeThreshold("NY", "CALENDAR_YEAR", 100_000)],
      revenueEntries: [
        makeRevenueEntry("NY", 2026, 3, 10_000),
        makeRevenueEntry("NY", 2026, 4, 20_000),
        makeRevenueEntry("NY", 2026, 5, 20_000),
      ],
    });

    expect(output.results[0].velocityData.trailing60DayMonthlyAvg).toBe(15_000);
    expect(output.results[0].velocityData.estimatedDaysToThreshold).toBe(100);
  });

  it("9) transaction threshold controls when transaction percent is higher", () => {
    const output = runEngine({
      stateThresholds: [makeThreshold("IL", "CALENDAR_YEAR", 200_000, 100)],
      revenueEntries: [makeRevenueEntry("IL", 2026, 5, 50_000, 95)],
    });

    expect(output.results[0].percentOfRevenue).toBe(25);
    expect(output.results[0].percentOfTransactions).toBe(95);
    expect(output.results[0].controllingPercent).toBe(95);
    expect(output.results[0].band).toBe("URGENT");
  });

  it("10) rolling 12 months window differs from calendar year window", () => {
    const entries: RevenueEntry[] = [
      makeRevenueEntry("WA", 2025, 8, 40_000),
      makeRevenueEntry("WA", 2025, 12, 30_000),
      makeRevenueEntry("WA", 2026, 2, 20_000),
      makeRevenueEntry("WA", 2026, 5, 5_000),
    ];

    const rolling = runEngine({
      stateThresholds: [makeThreshold("WA", "ROLLING_12_MONTHS", 100_000)],
      revenueEntries: entries,
    });
    const calendar = runEngine({
      stateThresholds: [makeThreshold("WA", "CALENDAR_YEAR", 100_000)],
      revenueEntries: entries,
    });

    expect(rolling.results[0].totalRevenue).toBe(95_000);
    expect(calendar.results[0].totalRevenue).toBe(25_000);
    expect(rolling.results[0].controllingPercent).toBeGreaterThan(
      calendar.results[0].controllingPercent,
    );
  });
});
