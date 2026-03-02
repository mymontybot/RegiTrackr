import type { NexusBand } from "./nexus.engine";

export type RevenueEntry = {
  entityId: string;
  stateCode: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
};

export type StateThreshold = {
  stateCode: string;
  stateName: string;
  salesThreshold: number | null;
  measurementPeriod: "CALENDAR_YEAR" | "ROLLING_12_MONTHS" | "PRIOR_YEAR";
  registrationStatus?: "REGISTERED" | "MONITORING" | "EXEMPT" | "IGNORED";
};

export type NexusTriggerHistory = {
  stateCode: string;
  stateName: string;
  firstWarningDate: { year: number; month: number } | null;
  firstUrgentDate: { year: number; month: number } | null;
  firstTriggeredDate: { year: number; month: number } | null;
  currentBand: NexusBand;
  dataQualityNote: string | null;
};

function monthId(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function monthFromId(id: number): { year: number; month: number } {
  return { year: Math.floor(id / 12), month: (id % 12) + 1 };
}

function formatMonthYear(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function sumForWindow(
  monthRevenueMap: Map<number, number>,
  currentMonthId: number,
  measurementPeriod: StateThreshold["measurementPeriod"],
): number {
  const current = monthFromId(currentMonthId);

  let start = currentMonthId;
  let end = currentMonthId;
  if (measurementPeriod === "ROLLING_12_MONTHS") {
    start = currentMonthId - 11;
    end = currentMonthId;
  } else if (measurementPeriod === "CALENDAR_YEAR") {
    start = monthId(current.year, 1);
    end = currentMonthId;
  } else {
    start = monthId(current.year - 1, 1);
    end = monthId(current.year - 1, 12);
  }

  let total = 0;
  for (let id = start; id <= end; id += 1) {
    total += monthRevenueMap.get(id) ?? 0;
  }
  return total;
}

function bandForPercent(percent: number, isRegistered: boolean): NexusBand {
  if (isRegistered) return "REGISTERED";
  if (percent >= 100) return "TRIGGERED";
  if (percent >= 90) return "URGENT";
  if (percent >= 70) return "WARNING";
  return "SAFE";
}

function detectDataQualityNote(sortedMonthIds: number[]): string | null {
  if (sortedMonthIds.length === 0) return null;

  const first = monthFromId(sortedMonthIds[0]);
  if (first.month > 1) {
    return `Revenue data starts ${formatMonthYear(first.year, first.month)} — earlier crossing dates may not be reflected`;
  }

  for (let i = 1; i < sortedMonthIds.length; i += 1) {
    const prev = sortedMonthIds[i - 1];
    const current = sortedMonthIds[i];
    if (current - prev > 1) {
      const gapStart = monthFromId(prev + 1);
      const gapEnd = monthFromId(current - 1);
      return `Revenue data has gaps (${formatMonthYear(gapStart.year, gapStart.month)} to ${formatMonthYear(gapEnd.year, gapEnd.month)}) — earlier crossing dates may not be reflected`;
    }
  }

  return null;
}

export function findTriggerDates(
  entityId: string,
  stateCode: string,
  revenueEntries: RevenueEntry[],
  threshold: StateThreshold,
): NexusTriggerHistory {
  const filtered = revenueEntries
    .filter((entry) => entry.entityId === entityId && entry.stateCode === stateCode)
    .sort((a, b) => monthId(a.periodYear, a.periodMonth) - monthId(b.periodYear, b.periodMonth));

  const monthRevenueMap = new Map<number, number>();
  for (const entry of filtered) {
    const id = monthId(entry.periodYear, entry.periodMonth);
    monthRevenueMap.set(id, (monthRevenueMap.get(id) ?? 0) + entry.amount);
  }
  const sortedMonthIds = Array.from(monthRevenueMap.keys()).sort((a, b) => a - b);

  let firstWarningDate: { year: number; month: number } | null = null;
  let firstUrgentDate: { year: number; month: number } | null = null;
  let firstTriggeredDate: { year: number; month: number } | null = null;
  let latestPercent = 0;

  const revenueThreshold = threshold.salesThreshold ?? 0;
  for (const periodId of sortedMonthIds) {
    const cumulativeRevenue = sumForWindow(monthRevenueMap, periodId, threshold.measurementPeriod);
    const percent = revenueThreshold > 0 ? (cumulativeRevenue / revenueThreshold) * 100 : 0;
    latestPercent = percent;

    const period = monthFromId(periodId);
    if (percent >= 70 && !firstWarningDate) {
      firstWarningDate = { year: period.year, month: period.month };
    }
    if (percent >= 90 && !firstUrgentDate) {
      firstUrgentDate = { year: period.year, month: period.month };
    }
    if (percent >= 100 && !firstTriggeredDate) {
      firstTriggeredDate = { year: period.year, month: period.month };
    }
  }

  const isRegistered = threshold.registrationStatus === "REGISTERED";
  const currentBand = bandForPercent(latestPercent, isRegistered);
  const dataQualityNote = detectDataQualityNote(sortedMonthIds);

  return {
    stateCode: threshold.stateCode,
    stateName: threshold.stateName,
    firstWarningDate,
    firstUrgentDate,
    firstTriggeredDate,
    currentBand,
    dataQualityNote,
  };
}
