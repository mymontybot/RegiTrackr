import type { PrismaClient } from "@prisma/client";

type HolidayRow = {
  stateCode: string | null;
  date: Date;
  name: string;
  year: number;
};

const YEARS = [2025, 2026, 2027] as const;
const TOP_NEXUS_STATES = ["CA", "TX", "NY", "FL", "IL", "PA", "OH", "GA", "NC", "WA"] as const;

function atUtcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function weekdayUtc(date: Date): number {
  return date.getUTCDay();
}

function observedFederalDate(date: Date): Date {
  const day = weekdayUtc(date);
  if (day === 6) return atUtcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1);
  if (day === 0) return atUtcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return date;
}

function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  occurrence: number,
): Date {
  const first = atUtcDate(year, monthIndex, 1);
  const firstWeekday = first.getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const day = 1 + offset + (occurrence - 1) * 7;
  return atUtcDate(year, monthIndex, day);
}

function lastWeekdayOfMonth(year: number, monthIndex: number, weekday: number): Date {
  const last = atUtcDate(year, monthIndex + 1, 0);
  const diff = (last.getUTCDay() - weekday + 7) % 7;
  return atUtcDate(year, monthIndex, last.getUTCDate() - diff);
}

function firstTuesdayAfterFirstMonday(year: number, monthIndex: number): Date {
  // Election Day rule: Tuesday after the first Monday in November.
  for (let day = 2; day <= 8; day += 1) {
    const d = atUtcDate(year, monthIndex, day);
    if (d.getUTCDay() === 2) return d;
  }
  return atUtcDate(year, monthIndex, 2);
}

function addHoliday(
  rows: HolidayRow[],
  stateCode: string | null,
  name: string,
  date: Date,
): void {
  rows.push({
    stateCode,
    name,
    date,
    year: date.getUTCFullYear(),
  });
}

function federalHolidayRows(year: number): HolidayRow[] {
  const rows: HolidayRow[] = [];

  addHoliday(rows, null, "New Year's Day", observedFederalDate(atUtcDate(year, 0, 1)));
  addHoliday(rows, null, "Martin Luther King Jr. Day", nthWeekdayOfMonth(year, 0, 1, 3));
  addHoliday(rows, null, "Presidents' Day", nthWeekdayOfMonth(year, 1, 1, 3));
  addHoliday(rows, null, "Memorial Day", lastWeekdayOfMonth(year, 4, 1));
  addHoliday(rows, null, "Juneteenth National Independence Day", observedFederalDate(atUtcDate(year, 5, 19)));
  addHoliday(rows, null, "Independence Day", observedFederalDate(atUtcDate(year, 6, 4)));
  addHoliday(rows, null, "Labor Day", nthWeekdayOfMonth(year, 8, 1, 1));
  addHoliday(rows, null, "Columbus Day", nthWeekdayOfMonth(year, 9, 1, 2));
  addHoliday(rows, null, "Veterans Day", observedFederalDate(atUtcDate(year, 10, 11)));
  addHoliday(rows, null, "Thanksgiving Day", nthWeekdayOfMonth(year, 10, 4, 4));
  addHoliday(rows, null, "Christmas Day", observedFederalDate(atUtcDate(year, 11, 25)));

  return rows;
}

function stateBankingHolidayRows(year: number): HolidayRow[] {
  const rows: HolidayRow[] = [];
  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4);
  const dayAfterThanksgiving = atUtcDate(
    thanksgiving.getUTCFullYear(),
    thanksgiving.getUTCMonth(),
    thanksgiving.getUTCDate() + 1,
  );

  // CA
  addHoliday(rows, "CA", "Cesar Chavez Day", observedFederalDate(atUtcDate(year, 2, 31)));
  // TX
  addHoliday(rows, "TX", "Day After Thanksgiving", dayAfterThanksgiving);
  // NY
  addHoliday(rows, "NY", "Election Day", firstTuesdayAfterFirstMonday(year, 10));
  // FL
  addHoliday(rows, "FL", "Day After Thanksgiving", dayAfterThanksgiving);
  // IL
  addHoliday(rows, "IL", "Lincoln's Birthday", observedFederalDate(atUtcDate(year, 1, 12)));
  // PA
  addHoliday(rows, "PA", "Day After Thanksgiving", dayAfterThanksgiving);
  // OH
  addHoliday(rows, "OH", "Day After Thanksgiving", dayAfterThanksgiving);
  // GA
  addHoliday(rows, "GA", "Day After Thanksgiving", dayAfterThanksgiving);
  // NC
  addHoliday(rows, "NC", "Day After Thanksgiving", dayAfterThanksgiving);
  // WA
  addHoliday(rows, "WA", "Native American Heritage Day", dayAfterThanksgiving);

  return rows;
}

export async function seedPublicHolidays(prisma: PrismaClient): Promise<number> {
  const rows = YEARS.flatMap((year) => [
    ...federalHolidayRows(year),
    ...stateBankingHolidayRows(year),
  ]);

  await prisma.publicHoliday.deleteMany({
    where: {
      year: { in: [...YEARS] },
      OR: [{ stateCode: null }, { stateCode: { in: [...TOP_NEXUS_STATES] } }],
    },
  });

  const result = await prisma.publicHoliday.createMany({ data: rows });
  return result.count;
}
