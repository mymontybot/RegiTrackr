import { describe, expect, it } from "vitest";
import {
  adjustDueDateForHolidays,
  generateFilingSchedule,
  generateReminderEvents,
  getOverdueFilings,
  transitionFilingStatus,
  type DeadlineEngineInput,
  type GeneratedFilingRecord,
  type NexusRegistration,
  type PublicHoliday,
  type StateFilingRule,
} from "./deadline.engine";

function makeInput(
  overrides: Partial<DeadlineEngineInput> = {},
): DeadlineEngineInput {
  const nexusRegistration: NexusRegistration = {
    entityId: "entity-1",
    firmId: "firm-1",
    stateCode: "CA",
    filingFrequency: "MONTHLY",
    registrationDate: new Date("2026-01-01T00:00:00.000Z"),
    status: "REGISTERED",
  };

  const stateFilingRule: StateFilingRule = {
    stateCode: "CA",
    filingFrequency: "MONTHLY",
    dueDateDaysAfterPeriod: 20,
  };

  return {
    nexusRegistration,
    stateFilingRule,
    publicHolidays: [],
    generateMonthsAhead: 12,
    asOfDate: new Date("2026-01-10T00:00:00.000Z"),
    ...overrides,
  };
}

function record(overrides: Partial<GeneratedFilingRecord>): GeneratedFilingRecord {
  return {
    id: "fr-1",
    entityId: "entity-1",
    firmId: "firm-1",
    stateCode: "CA",
    periodYear: 2026,
    periodMonth: 1,
    periodQuarter: null,
    rawDueDate: new Date("2026-02-20T00:00:00.000Z"),
    adjustedDueDate: new Date("2026-02-20T00:00:00.000Z"),
    status: "UPCOMING",
    ...overrides,
  };
}

describe("deadline engine", () => {
  it("1) monthly filer generates 12 due dates", () => {
    const records = generateFilingSchedule(makeInput());
    expect(records).toHaveLength(12);
    expect(records.every((r) => r.status === "UPCOMING")).toBe(true);
  });

  it("2) quarterly filer generates 4 due dates", () => {
    const records = generateFilingSchedule(
      makeInput({
        nexusRegistration: {
          ...makeInput().nexusRegistration,
          filingFrequency: "QUARTERLY",
        },
        stateFilingRule: {
          ...makeInput().stateFilingRule,
          filingFrequency: "QUARTERLY",
        },
      }),
    );
    expect(records).toHaveLength(4);
    expect(records.map((r) => r.periodQuarter)).toEqual([1, 2, 3, 4]);
  });

  it("3) annual filer generates 1 due date", () => {
    const records = generateFilingSchedule(
      makeInput({
        nexusRegistration: {
          ...makeInput().nexusRegistration,
          filingFrequency: "ANNUAL",
        },
        stateFilingRule: {
          ...makeInput().stateFilingRule,
          filingFrequency: "ANNUAL",
        },
      }),
    );
    expect(records).toHaveLength(1);
    expect(records[0].periodMonth).toBe(12);
  });

  it("4) saturday raw due date adjusts to friday", () => {
    const adjusted = adjustDueDateForHolidays(
      new Date("2026-01-10T00:00:00.000Z"), // Saturday
      "CA",
      [],
    );
    expect(adjusted.toISOString()).toBe("2026-01-09T00:00:00.000Z");
  });

  it("5) sunday raw due date adjusts to monday", () => {
    const adjusted = adjustDueDateForHolidays(
      new Date("2026-01-11T00:00:00.000Z"), // Sunday
      "CA",
      [],
    );
    expect(adjusted.toISOString()).toBe("2026-01-12T00:00:00.000Z");
  });

  it("6) federal holiday moves to next business day", () => {
    const holidays: PublicHoliday[] = [
      { stateCode: null, name: "Independence Day (Observed)", year: 2026, date: new Date("2026-07-03T00:00:00.000Z") },
    ];
    const adjusted = adjustDueDateForHolidays(
      new Date("2026-07-03T00:00:00.000Z"),
      "CA",
      holidays,
    );
    expect(adjusted.toISOString()).toBe("2026-07-06T00:00:00.000Z");
  });

  it("7) state banking holiday moves to next business day", () => {
    const holidays: PublicHoliday[] = [
      { stateCode: "WA", name: "Native American Heritage Day", year: 2026, date: new Date("2026-11-27T00:00:00.000Z") },
    ];
    const adjusted = adjustDueDateForHolidays(
      new Date("2026-11-27T00:00:00.000Z"),
      "WA",
      holidays,
    );
    expect(adjusted.toISOString()).toBe("2026-11-30T00:00:00.000Z");
  });

  it("8) holiday chain keeps adjusting until valid business day", () => {
    const holidays: PublicHoliday[] = [
      { stateCode: null, name: "Federal", year: 2026, date: new Date("2026-06-15T00:00:00.000Z") },
      { stateCode: "CA", name: "State", year: 2026, date: new Date("2026-06-16T00:00:00.000Z") },
    ];
    const adjusted = adjustDueDateForHolidays(
      new Date("2026-06-15T00:00:00.000Z"),
      "CA",
      holidays,
    );
    expect(adjusted.toISOString()).toBe("2026-06-17T00:00:00.000Z");
  });

  it("9) overdue detection marks yesterday UPCOMING record as OVERDUE", () => {
    const overdue = getOverdueFilings(
      [
        record({
          adjustedDueDate: new Date("2026-01-09T00:00:00.000Z"),
          status: "UPCOMING",
        }),
      ],
      new Date("2026-01-10T00:00:00.000Z"),
    );

    expect(overdue).toHaveLength(1);
    expect(overdue[0].status).toBe("OVERDUE");
  });

  it("10) status transition PREPARED -> CONFIRMED is valid", () => {
    expect(transitionFilingStatus("PREPARED", "CONFIRMED")).toBe("CONFIRMED");
  });

  it("11) status transition CONFIRMED -> UPCOMING throws", () => {
    expect(() => transitionFilingStatus("CONFIRMED", "UPCOMING")).toThrow(
      "Invalid filing status transition",
    );
  });

  it("12) reminder events generated at all 5 intervals", () => {
    const events = generateReminderEvents([
      record({
        id: "fr-12",
        adjustedDueDate: new Date("2026-02-20T00:00:00.000Z"),
        status: "UPCOMING",
      }),
    ]);

    expect(events).toHaveLength(5);
    expect(events.map((e) => e.daysUntilDue).sort((a, b) => a - b)).toEqual([1, 3, 7, 14, 30]);
  });

  it("13) no reminders for FILED status", () => {
    const events = generateReminderEvents([
      record({
        id: "fr-13",
        status: "FILED",
      }),
    ]);
    expect(events).toHaveLength(0);
  });
});
