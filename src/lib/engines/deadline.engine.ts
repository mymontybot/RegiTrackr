export type FilingFrequency = "MONTHLY" | "QUARTERLY" | "ANNUAL";
export type FilingStatus = "UPCOMING" | "PREPARED" | "FILED" | "CONFIRMED" | "OVERDUE";
export type NexusRegistrationStatus = "MONITORING" | "REGISTERED" | "EXEMPT" | "IGNORED";

export type NexusRegistration = {
  entityId: string;
  firmId: string;
  stateCode: string;
  status: NexusRegistrationStatus;
  filingFrequency: FilingFrequency | null;
  registrationDate?: Date | string | null;
};

export type StateFilingRule = {
  stateCode: string;
  filingFrequency: FilingFrequency;
  dueDateDaysAfterPeriod: number;
};

export type PublicHoliday = {
  stateCode: string | null;
  date: Date | string;
  name: string;
  year: number;
};

export type GeneratedFilingRecord = {
  id: string;
  entityId: string;
  firmId: string;
  stateCode: string;
  periodYear: number;
  periodMonth: number | null;
  periodQuarter: number | null;
  rawDueDate: Date;
  adjustedDueDate: Date;
  status: FilingStatus;
};

export type ReminderEvent = {
  entityId: string;
  firmId: string;
  stateCode: string;
  dueDate: Date;
  daysUntilDue: 30 | 14 | 7 | 3 | 1;
  filingRecordId: string;
};

export type DeadlineEngineInput = {
  nexusRegistration: NexusRegistration;
  stateFilingRule: StateFilingRule;
  publicHolidays: PublicHoliday[];
  generateMonthsAhead?: number;
  asOfDate?: Date;
};

const REMINDER_INTERVALS: ReminderEvent["daysUntilDue"][] = [30, 14, 7, 3, 1];

function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseDate(date: Date | string): Date {
  const parsed = date instanceof Date ? date : new Date(date);
  return toUtcDateOnly(parsed);
}

function dateKey(date: Date): string {
  return toUtcDateOnly(date).toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function weekday(date: Date): number {
  return date.getUTCDay();
}

function isWeekend(date: Date): boolean {
  const day = weekday(date);
  return day === 0 || day === 6;
}

function firstDayOfCurrentMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthId(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function periodDates(
  frequency: FilingFrequency,
  startMonth: Date,
  monthsAhead: number,
): Array<{ periodEnd: Date; periodYear: number; periodMonth: number | null; periodQuarter: number | null }> {
  if (frequency === "MONTHLY") {
    return Array.from({ length: monthsAhead }, (_, i) => {
      const monthDate = addMonths(startMonth, i);
      return {
        periodEnd: endOfMonth(monthDate),
        periodYear: monthDate.getUTCFullYear(),
        periodMonth: monthDate.getUTCMonth() + 1,
        periodQuarter: null,
      };
    });
  }

  if (frequency === "QUARTERLY") {
    const endMonthId = monthId(addMonths(startMonth, monthsAhead - 1));
    const output: Array<{
      periodEnd: Date;
      periodYear: number;
      periodMonth: number | null;
      periodQuarter: number | null;
    }> = [];

    for (let i = 0; i < monthsAhead; i += 1) {
      const monthDate = addMonths(startMonth, i);
      const month = monthDate.getUTCMonth() + 1;
      if (month !== 3 && month !== 6 && month !== 9 && month !== 12) continue;

      const periodEnd = endOfMonth(monthDate);
      if (monthId(periodEnd) > endMonthId) continue;

      output.push({
        periodEnd,
        periodYear: monthDate.getUTCFullYear(),
        periodMonth: month,
        periodQuarter: Math.ceil(month / 3),
      });
    }

    return output;
  }

  // ANNUAL
  const endMonthId = monthId(addMonths(startMonth, monthsAhead - 1));
  const output: Array<{
    periodEnd: Date;
    periodYear: number;
    periodMonth: number | null;
    periodQuarter: number | null;
  }> = [];

  for (let year = startMonth.getUTCFullYear(); year <= startMonth.getUTCFullYear() + 2; year += 1) {
    const periodEnd = new Date(Date.UTC(year, 11, 31));
    const id = monthId(periodEnd);
    if (id < monthId(startMonth) || id > endMonthId) continue;

    output.push({
      periodEnd,
      periodYear: year,
      periodMonth: 12,
      periodQuarter: null,
    });
  }

  return output;
}

function holidaySetForState(publicHolidays: PublicHoliday[], stateCode: string): Set<string> {
  return new Set(
    publicHolidays
      .filter((h) => h.stateCode === null || h.stateCode === stateCode)
      .map((h) => dateKey(parseDate(h.date))),
  );
}

function nextBusinessDay(start: Date, holidaySet: Set<string>): Date {
  let date = toUtcDateOnly(start);
  for (let i = 0; i < 15; i += 1) {
    if (!isWeekend(date) && !holidaySet.has(dateKey(date))) {
      return date;
    }
    date = addDays(date, 1);
  }
  return date;
}

export function adjustDueDateForHolidays(
  rawDueDate: Date,
  stateCode: string,
  publicHolidays: PublicHoliday[],
): Date {
  const holidaySet = holidaySetForState(publicHolidays, stateCode);
  let adjusted = toUtcDateOnly(rawDueDate);

  // Weekend adjustment first.
  if (weekday(adjusted) === 6) {
    adjusted = addDays(adjusted, -1);
  } else if (weekday(adjusted) === 0) {
    adjusted = addDays(adjusted, 1);
  }

  // Repeated holiday checks (max 5 iterations as requested).
  for (let i = 0; i < 5; i += 1) {
    if (!holidaySet.has(dateKey(adjusted))) {
      break;
    }
    adjusted = nextBusinessDay(addDays(adjusted, 1), holidaySet);
  }

  return adjusted;
}

export function generateFilingSchedule(input: DeadlineEngineInput): GeneratedFilingRecord[] {
  const asOfDate = input.asOfDate ? toUtcDateOnly(input.asOfDate) : toUtcDateOnly(new Date());
  const monthsAhead = input.generateMonthsAhead ?? 12;
  const registrationDate = input.nexusRegistration.registrationDate
    ? parseDate(input.nexusRegistration.registrationDate)
    : null;

  const startMonth = registrationDate && registrationDate > asOfDate
    ? firstDayOfCurrentMonth(registrationDate)
    : firstDayOfCurrentMonth(asOfDate);

  const frequency = input.nexusRegistration.filingFrequency ?? input.stateFilingRule.filingFrequency;
  const periods = periodDates(frequency, startMonth, monthsAhead);

  return periods.map((period, index) => {
    const rawDueDate = addDays(period.periodEnd, input.stateFilingRule.dueDateDaysAfterPeriod);
    const adjustedDueDate = adjustDueDateForHolidays(
      rawDueDate,
      input.nexusRegistration.stateCode,
      input.publicHolidays,
    );

    return {
      id: `filing-${input.nexusRegistration.entityId}-${period.periodYear}-${String(index + 1).padStart(2, "0")}`,
      entityId: input.nexusRegistration.entityId,
      firmId: input.nexusRegistration.firmId,
      stateCode: input.nexusRegistration.stateCode,
      periodYear: period.periodYear,
      periodMonth: period.periodMonth,
      periodQuarter: period.periodQuarter,
      rawDueDate,
      adjustedDueDate,
      status: "UPCOMING",
    };
  });
}

export function transitionFilingStatus(
  current: FilingStatus,
  next: FilingStatus,
): FilingStatus {
  const allowed: Record<FilingStatus, FilingStatus[]> = {
    UPCOMING: ["PREPARED", "OVERDUE"],
    PREPARED: ["FILED", "CONFIRMED", "OVERDUE"],
    FILED: ["CONFIRMED"],
    CONFIRMED: [],
    OVERDUE: ["FILED"],
  };

  if (!allowed[current].includes(next)) {
    throw new Error(`Invalid filing status transition: ${current} -> ${next}`);
  }
  return next;
}

export function getOverdueFilings(
  records: GeneratedFilingRecord[],
  asOfDate: Date = new Date(),
): GeneratedFilingRecord[] {
  const now = toUtcDateOnly(asOfDate);
  return records
    .filter(
      (record) =>
        toUtcDateOnly(record.adjustedDueDate) < now &&
        record.status !== "FILED" &&
        record.status !== "CONFIRMED",
    )
    .map((record) => ({ ...record, status: "OVERDUE" }));
}

export function generateReminderEvents(records: GeneratedFilingRecord[]): ReminderEvent[] {
  return records.flatMap((record) => {
    if (record.status !== "UPCOMING" && record.status !== "PREPARED") {
      return [];
    }

    return REMINDER_INTERVALS.map((daysUntilDue) => ({
      entityId: record.entityId,
      firmId: record.firmId,
      stateCode: record.stateCode,
      dueDate: record.adjustedDueDate,
      daysUntilDue,
      filingRecordId: record.id,
    }));
  });
}
