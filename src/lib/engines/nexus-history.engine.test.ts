import { describe, expect, it } from "vitest";
import { findTriggerDates, type RevenueEntry, type StateThreshold } from "./nexus-history.engine";

function makeEntry(
  periodYear: number,
  periodMonth: number,
  amount: number,
): RevenueEntry {
  return {
    entityId: "entity-1",
    stateCode: "CA",
    periodYear,
    periodMonth,
    amount,
  };
}

function threshold(overrides: Partial<StateThreshold> = {}): StateThreshold {
  return {
    stateCode: "CA",
    stateName: "California",
    salesThreshold: 100_000,
    measurementPeriod: "CALENDAR_YEAR",
    ...overrides,
  };
}

describe("nexus-history engine", () => {
  it("1) crossed warning in Jan, urgent in Mar, triggered in May", () => {
    const entries: RevenueEntry[] = [
      makeEntry(2026, 1, 70_000),
      makeEntry(2026, 2, 10_000),
      makeEntry(2026, 3, 10_000),
      makeEntry(2026, 4, 5_000),
      makeEntry(2026, 5, 5_000),
    ];

    const history = findTriggerDates("entity-1", "CA", entries, threshold());

    expect(history.firstWarningDate).toEqual({ year: 2026, month: 1 });
    expect(history.firstUrgentDate).toEqual({ year: 2026, month: 3 });
    expect(history.firstTriggeredDate).toEqual({ year: 2026, month: 5 });
    expect(history.currentBand).toBe("TRIGGERED");
  });

  it("2) never crossed warning -> all dates null", () => {
    const entries: RevenueEntry[] = [
      makeEntry(2026, 1, 20_000),
      makeEntry(2026, 2, 20_000),
      makeEntry(2026, 3, 20_000),
    ];

    const history = findTriggerDates("entity-1", "CA", entries, threshold());

    expect(history.firstWarningDate).toBeNull();
    expect(history.firstUrgentDate).toBeNull();
    expect(history.firstTriggeredDate).toBeNull();
    expect(history.currentBand).toBe("SAFE");
  });

  it("3) data gaps produce a dataQualityNote", () => {
    const entries: RevenueEntry[] = [
      makeEntry(2023, 3, 10_000),
      makeEntry(2023, 6, 20_000),
    ];

    const history = findTriggerDates("entity-1", "CA", entries, threshold());

    expect(history.dataQualityNote).toBeTruthy();
  });

  it("4) currently registered -> currentBand REGISTERED", () => {
    const entries: RevenueEntry[] = [
      makeEntry(2026, 1, 200_000),
    ];
    const registeredThreshold = threshold({ registrationStatus: "REGISTERED" });

    const history = findTriggerDates("entity-1", "CA", entries, registeredThreshold);

    expect(history.currentBand).toBe("REGISTERED");
  });
});
