export type MeasurementPeriod = "CALENDAR_YEAR" | "ROLLING_12_MONTHS" | "PRIOR_YEAR";
export type NexusRegistrationStatus = "MONITORING" | "REGISTERED" | "EXEMPT" | "IGNORED";
export type NexusBand = "SAFE" | "WARNING" | "URGENT" | "TRIGGERED" | "REGISTERED";
export type NexusAlertType =
  | "WARNING_70"
  | "URGENT_90"
  | "TRIGGERED_100"
  | "TRIGGERED_NOT_REGISTERED";

export type RevenueEntry = {
  entityId: string;
  stateCode: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  transactionCount: number;
};

export type StateThreshold = {
  stateCode: string;
  stateName: string;
  salesThreshold: number | null;
  transactionThreshold: number | null;
  measurementPeriod: MeasurementPeriod;
};

export type NexusRegistration = {
  entityId: string;
  stateCode: string;
  status: NexusRegistrationStatus;
};

export type VelocityData = {
  trailing60DayMonthlyAvg: number | null;
  estimatedDaysToThreshold: number | null;
};

export type NexusResult = {
  stateCode: string;
  stateName: string;
  totalRevenue: number;
  revenueThreshold: number | null;
  percentOfRevenue: number;
  totalTransactions: number;
  transactionThreshold: number | null;
  percentOfTransactions: number;
  controllingPercent: number;
  band: NexusBand;
  isRegistered: boolean;
  velocityData: VelocityData;
  dataQualityFlags: string[];
};

export type NexusAlert = {
  firmId: string;
  entityId: string;
  stateCode: string;
  alertType: NexusAlertType;
  band: NexusBand;
  periodKey: string;
  dedupeKey: string;
};

export type NexusEngineInput = {
  entityId: string;
  firmId: string;
  revenueEntries: RevenueEntry[];
  stateThresholds: StateThreshold[];
  registrations: NexusRegistration[];
  asOfDate?: Date;
};

export type NexusEngineOutput = {
  results: NexusResult[];
  alerts: NexusAlert[];
};

function monthId(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function monthFromId(id: number): { year: number; month: number } {
  return { year: Math.floor(id / 12), month: (id % 12) + 1 };
}

function currentMonthId(asOfDate: Date): number {
  return monthId(asOfDate.getUTCFullYear(), asOfDate.getUTCMonth() + 1);
}

function toPeriodKey(measurementPeriod: MeasurementPeriod, asOfDate: Date): string {
  const year = asOfDate.getUTCFullYear();
  const month = asOfDate.getUTCMonth() + 1;

  if (measurementPeriod === "ROLLING_12_MONTHS") {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  if (measurementPeriod === "PRIOR_YEAR") {
    return `${year - 1}`;
  }
  return `${year}`;
}

function windowRange(measurementPeriod: MeasurementPeriod, asOfDate: Date): { start: number; end: number } {
  const end = currentMonthId(asOfDate);
  const year = asOfDate.getUTCFullYear();

  if (measurementPeriod === "ROLLING_12_MONTHS") {
    return { start: end - 11, end };
  }
  if (measurementPeriod === "PRIOR_YEAR") {
    return {
      start: monthId(year - 1, 1),
      end: monthId(year - 1, 12),
    };
  }
  return {
    start: monthId(year, 1),
    end,
  };
}

function pct(value: number, threshold: number | null): number {
  if (!threshold || threshold <= 0) {
    return 0;
  }
  return Number(((value / threshold) * 100).toFixed(2));
}

function isRegisteredForState(
  registrations: NexusRegistration[],
  entityId: string,
  stateCode: string,
): boolean {
  return registrations.some(
    (registration) =>
      registration.entityId === entityId &&
      registration.stateCode === stateCode &&
      registration.status === "REGISTERED",
  );
}

function toBand(controllingPercent: number, registered: boolean): NexusBand {
  if (registered) return "REGISTERED";
  if (controllingPercent >= 100) return "TRIGGERED";
  if (controllingPercent >= 90) return "URGENT";
  if (controllingPercent >= 70) return "WARNING";
  return "SAFE";
}

function missingPeriodFlags(
  entries: RevenueEntry[],
  start: number,
  end: number,
): string[] {
  const seenPeriods = new Set(entries.map((entry) => monthId(entry.periodYear, entry.periodMonth)));
  const flags: string[] = [];

  for (let id = start; id <= end; id += 1) {
    if (!seenPeriods.has(id)) {
      const period = monthFromId(id);
      const monthLabel = new Date(Date.UTC(period.year, period.month - 1, 1)).toLocaleString(
        "en-US",
        { month: "long", year: "numeric", timeZone: "UTC" },
      );
      flags.push(`Missing revenue data for ${monthLabel}`);
    }
  }

  return flags;
}

function computeVelocity(
  entries: RevenueEntry[],
  salesThreshold: number | null,
  currentRevenue: number,
  asOfDate: Date,
): VelocityData {
  const asOfMonth = currentMonthId(asOfDate);
  const monthA = asOfMonth - 1;
  const monthB = asOfMonth - 2;

  const byMonth = new Map<number, number>();
  for (const entry of entries) {
    const id = monthId(entry.periodYear, entry.periodMonth);
    byMonth.set(id, (byMonth.get(id) ?? 0) + entry.amount);
  }

  if (!byMonth.has(monthA) || !byMonth.has(monthB)) {
    return { trailing60DayMonthlyAvg: null, estimatedDaysToThreshold: null };
  }

  const monthlyAvg = ((byMonth.get(monthA) ?? 0) + (byMonth.get(monthB) ?? 0)) / 2;
  if (!salesThreshold || salesThreshold <= 0 || monthlyAvg <= 0 || currentRevenue >= salesThreshold) {
    return {
      trailing60DayMonthlyAvg: Number(monthlyAvg.toFixed(2)),
      estimatedDaysToThreshold: null,
    };
  }

  const estimatedDays = Number((((salesThreshold - currentRevenue) / monthlyAvg) * 30).toFixed(2));
  return {
    trailing60DayMonthlyAvg: Number(monthlyAvg.toFixed(2)),
    estimatedDaysToThreshold: estimatedDays,
  };
}

function alertWithKey(
  params: Omit<NexusAlert, "dedupeKey">,
): NexusAlert {
  const dedupeKey = [
    params.firmId,
    params.entityId,
    params.stateCode,
    params.alertType,
    params.band,
    params.periodKey,
  ].join(":");

  return { ...params, dedupeKey };
}

export function calculateNexus(input: NexusEngineInput): NexusEngineOutput {
  const asOfDate = input.asOfDate ?? new Date();
  const entityEntries = input.revenueEntries.filter((entry) => entry.entityId === input.entityId);
  const alertsByKey = new Map<string, NexusAlert>();

  const results: NexusResult[] = input.stateThresholds.map((threshold) => {
    const { start, end } = windowRange(threshold.measurementPeriod, asOfDate);
    const stateEntries = entityEntries
      .filter((entry) => entry.stateCode === threshold.stateCode)
      .filter((entry) => {
        const id = monthId(entry.periodYear, entry.periodMonth);
        return id >= start && id <= end;
      });

    const totalRevenue = stateEntries.reduce((acc, entry) => acc + entry.amount, 0);
    const totalTransactions = stateEntries.reduce((acc, entry) => acc + entry.transactionCount, 0);
    const percentOfRevenue = pct(totalRevenue, threshold.salesThreshold);
    const percentOfTransactions = pct(totalTransactions, threshold.transactionThreshold);
    const controllingPercent = Math.max(percentOfRevenue, percentOfTransactions);
    const registered = isRegisteredForState(
      input.registrations,
      input.entityId,
      threshold.stateCode,
    );
    const band = toBand(controllingPercent, registered);
    const periodKey = toPeriodKey(threshold.measurementPeriod, asOfDate);

    if (!registered) {
      if (controllingPercent >= 100) {
        const triggered = alertWithKey({
          firmId: input.firmId,
          entityId: input.entityId,
          stateCode: threshold.stateCode,
          alertType: "TRIGGERED_100",
          band: "TRIGGERED",
          periodKey,
        });
        alertsByKey.set(triggered.dedupeKey, triggered);

        const notRegistered = alertWithKey({
          firmId: input.firmId,
          entityId: input.entityId,
          stateCode: threshold.stateCode,
          alertType: "TRIGGERED_NOT_REGISTERED",
          band: "TRIGGERED",
          periodKey,
        });
        alertsByKey.set(notRegistered.dedupeKey, notRegistered);
      } else if (controllingPercent >= 90) {
        const urgent = alertWithKey({
          firmId: input.firmId,
          entityId: input.entityId,
          stateCode: threshold.stateCode,
          alertType: "URGENT_90",
          band: "URGENT",
          periodKey,
        });
        alertsByKey.set(urgent.dedupeKey, urgent);
      } else if (controllingPercent >= 70) {
        const warning = alertWithKey({
          firmId: input.firmId,
          entityId: input.entityId,
          stateCode: threshold.stateCode,
          alertType: "WARNING_70",
          band: "WARNING",
          periodKey,
        });
        alertsByKey.set(warning.dedupeKey, warning);
      }
    }

    return {
      stateCode: threshold.stateCode,
      stateName: threshold.stateName,
      totalRevenue,
      revenueThreshold: threshold.salesThreshold,
      percentOfRevenue,
      totalTransactions,
      transactionThreshold: threshold.transactionThreshold,
      percentOfTransactions,
      controllingPercent,
      band,
      isRegistered: registered,
      velocityData: computeVelocity(stateEntries, threshold.salesThreshold, totalRevenue, asOfDate),
      dataQualityFlags: missingPeriodFlags(stateEntries, start, end),
    };
  });

  return {
    results,
    alerts: Array.from(alertsByKey.values()),
  };
}
