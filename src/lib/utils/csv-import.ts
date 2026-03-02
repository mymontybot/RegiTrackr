import type { BillingTier } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { NexusService } from "@/lib/services/nexus.service";
import { ValidationError } from "@/lib/utils/errors";

export type ParsedRow = {
  entityName: string;
  stateCode: string;
  periodYear: number;
  periodMonth: number;
  revenueAmount: number;
  transactionCount: number | null;
};

export type RowError = {
  rowNumber: number;
  field:
    | "entity_name"
    | "state_code"
    | "period_year"
    | "period_month"
    | "revenue_amount"
    | "transaction_count"
    | "row";
  message: string;
  value?: string;
};

export type CsvImportResult = {
  valid: ParsedRow[];
  errors: RowError[];
  totalRows: number;
  validCount: number;
  errorCount: number;
};

export type ImportProgressEvent = {
  processedRows: number;
  totalRows: number;
  percentage: number;
};

const TEMPLATE_HEADERS =
  "entity_name,state_code,period_year,period_month,revenue_amount,transaction_count";

const VALID_STATE_CODES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
]);

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }
  out.push(current.trim());
  return out;
}

export function downloadTemplate(): string {
  return `${TEMPLATE_HEADERS}\n`;
}

function validateRow(columns: string[], rowNumber: number): { parsed?: ParsedRow; errors: RowError[] } {
  const errors: RowError[] = [];
  const [entityNameRaw, stateCodeRaw, yearRaw, monthRaw, amountRaw, txRaw] = columns;

  const entityName = (entityNameRaw ?? "").trim();
  const stateCode = (stateCodeRaw ?? "").trim().toUpperCase();
  const periodYear = Number(yearRaw);
  const periodMonth = Number(monthRaw);
  const revenueAmount = Number(amountRaw);
  const transactionCount = txRaw && txRaw.trim().length > 0 ? Number(txRaw) : null;

  if (!entityName) {
    errors.push({ rowNumber, field: "entity_name", message: "entity_name is required" });
  }
  if (!VALID_STATE_CODES.has(stateCode)) {
    errors.push({
      rowNumber,
      field: "state_code",
      message: "state_code must be a valid 2-letter US code",
      value: stateCodeRaw,
    });
  }
  if (!/^\d{4}$/.test(String(yearRaw ?? ""))) {
    errors.push({
      rowNumber,
      field: "period_year",
      message: "period_year must be a 4-digit year",
      value: yearRaw,
    });
  }
  if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
    errors.push({
      rowNumber,
      field: "period_month",
      message: "period_month must be between 1 and 12",
      value: monthRaw,
    });
  }
  if (!Number.isFinite(revenueAmount) || revenueAmount <= 0) {
    errors.push({
      rowNumber,
      field: "revenue_amount",
      message: "revenue_amount must be a positive number",
      value: amountRaw,
    });
  }
  if (transactionCount !== null && (!Number.isFinite(transactionCount) || transactionCount < 0)) {
    errors.push({
      rowNumber,
      field: "transaction_count",
      message: "transaction_count must be empty or a non-negative number",
      value: txRaw,
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors,
    parsed: {
      entityName,
      stateCode,
      periodYear,
      periodMonth,
      revenueAmount,
      transactionCount,
    },
  };
}

export async function parseAndValidate(file: File): Promise<CsvImportResult> {
  const valid: ParsedRow[] = [];
  const errors: RowError[] = [];
  let totalRows = 0;
  let rowNumber = 0;
  let headerValidated = false;
  const expectedHeaders = TEMPLATE_HEADERS.split(",");

  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      rowNumber += 1;
      const columns = parseCsvLine(line);

      if (!headerValidated) {
        const normalized = columns.map((c) => c.toLowerCase().trim());
        const matches =
          normalized.length === expectedHeaders.length &&
          normalized.every((v, i) => v === expectedHeaders[i]);
        if (!matches) {
          throw new ValidationError(
            `Invalid CSV headers. Expected: ${TEMPLATE_HEADERS}`,
          );
        }
        headerValidated = true;
        continue;
      }

      totalRows += 1;
      const result = validateRow(columns, rowNumber);
      if (result.parsed) {
        valid.push(result.parsed);
      } else {
        errors.push(...result.errors);
      }
    }
  }

  // Handle trailing line after stream completes.
  if (buffer.trim().length > 0) {
    rowNumber += 1;
    const columns = parseCsvLine(buffer);
    if (!headerValidated) {
      const normalized = columns.map((c) => c.toLowerCase().trim());
      const matches =
        normalized.length === expectedHeaders.length &&
        normalized.every((v, i) => v === expectedHeaders[i]);
      if (!matches) {
        throw new ValidationError(`Invalid CSV headers. Expected: ${TEMPLATE_HEADERS}`);
      }
      headerValidated = true;
    } else {
      totalRows += 1;
      const result = validateRow(columns, rowNumber);
      if (result.parsed) {
        valid.push(result.parsed);
      } else {
        errors.push(...result.errors);
      }
    }
  }

  return {
    valid,
    errors,
    totalRows,
    validCount: valid.length,
    errorCount: errors.length,
  };
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function importRows(
  rows: ParsedRow[],
  firmId: string,
  userId: string,
): Promise<{ imported: number; progressEvents: ImportProgressEvent[] }> {
  const entityNames = [...new Set(rows.map((row) => row.entityName.trim()))];
  const entities = await prisma.entity.findMany({
    where: {
      firmId,
      name: { in: entityNames },
    },
    select: { id: true, name: true },
  });
  const entityByName = new Map(entities.map((e) => [e.name, e.id]));

  const missingEntities = entityNames.filter((name) => !entityByName.has(name));
  if (missingEntities.length > 0) {
    throw new ValidationError(
      `Entity names not found in firm: ${missingEntities.join(", ")}`,
    );
  }

  const batches = chunks(rows, 500);
  let processed = 0;
  let imported = 0;
  const progressEvents: ImportProgressEvent[] = [];
  const changedEntityIds = new Set<string>();

  for (const batch of batches) {
    await prisma.$transaction(async (tx) => {
      for (const row of batch) {
        const entityId = entityByName.get(row.entityName)!;
        changedEntityIds.add(entityId);

        const existing = await tx.revenueEntry.findFirst({
          where: {
            entityId,
            firmId,
            stateCode: row.stateCode,
            periodYear: row.periodYear,
            periodMonth: row.periodMonth,
          },
          select: { id: true },
        });

        if (existing) {
          await tx.revenueEntry.update({
            where: { id: existing.id },
            data: {
              amount: row.revenueAmount,
              transactionCount: row.transactionCount ?? 0,
              source: "CSV_IMPORT",
              enteredByUserId: userId,
            },
          });
        } else {
          await tx.revenueEntry.create({
            data: {
              entityId,
              firmId,
              stateCode: row.stateCode,
              periodYear: row.periodYear,
              periodMonth: row.periodMonth,
              amount: row.revenueAmount,
              transactionCount: row.transactionCount ?? 0,
              source: "CSV_IMPORT",
              enteredByUserId: userId,
            },
          });
        }
        imported += 1;
      }
    });

    processed += batch.length;
    progressEvents.push({
      processedRows: processed,
      totalRows: rows.length,
      percentage: Math.round((processed / rows.length) * 100),
    });
  }

  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { billingTier: true },
  });
  if (!firm) {
    throw new ValidationError("Firm not found for import recalculation");
  }

  const nexusService = new NexusService({
    firmId,
    userId,
    billingTier: firm.billingTier as BillingTier,
  });
  for (const entityId of changedEntityIds) {
    await nexusService.calculateEntityNexus(entityId);
  }

  return { imported, progressEvents };
}
