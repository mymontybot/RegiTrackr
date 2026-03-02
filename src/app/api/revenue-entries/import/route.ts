import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/services/auth.service";
import {
  importRows,
  parseAndValidate,
  type CsvImportResult,
} from "@/lib/utils/csv-import";
import { AuthError, ValidationError } from "@/lib/utils/errors";

const MAX_ROWS = 10_000;
const EXTENDED_TIMEOUT_MS = 30_000;

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AuthError("Authentication required");
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("CSV file is required");
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new ValidationError("Only CSV files are allowed");
    }

    const parsed: CsvImportResult = await parseAndValidate(file);
    if (parsed.totalRows > MAX_ROWS) {
      return NextResponse.json(
        {
          success: false,
          message: "File too large — try splitting into smaller batches",
          imported: 0,
          errors: [],
          totalRows: parsed.totalRows,
          processingTimeMs: Date.now() - startedAt,
        },
        { status: 400 },
      );
    }

    if (parsed.errorCount > 0) {
      return NextResponse.json(
        {
          success: false,
          imported: 0,
          errors: parsed.errors,
          totalRows: parsed.totalRows,
          processingTimeMs: Date.now() - startedAt,
        },
        { status: 400 },
      );
    }

    const tenant = await getTenantContext(userId);

    const runImport = () =>
      importRows(parsed.valid, tenant.firmId, tenant.userId);

    let imported = 0;
    if (parsed.totalRows >= 1_000) {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(1, EXTENDED_TIMEOUT_MS - elapsed);

      const importResult = await Promise.race([
        runImport(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("IMPORT_TIMEOUT")), remaining),
        ),
      ]).catch((error: unknown) => {
        if (error instanceof Error && error.message === "IMPORT_TIMEOUT") {
          return null;
        }
        throw error;
      });

      if (!importResult) {
        return NextResponse.json(
          {
            success: false,
            message: "File too large — try splitting into smaller batches",
            imported: 0,
            errors: [],
            totalRows: parsed.totalRows,
            processingTimeMs: Date.now() - startedAt,
          },
          { status: 408 },
        );
      }
      imported = importResult.imported;
    } else {
      const result = await runImport();
      imported = result.imported;
    }

    return NextResponse.json({
      success: true,
      imported,
      errors: [],
      totalRows: parsed.totalRows,
      processingTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          imported: 0,
          errors: [],
          totalRows: 0,
          processingTimeMs: Date.now() - startedAt,
        },
        { status: 400 },
      );
    }
    if (error instanceof AuthError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          imported: 0,
          errors: [],
          totalRows: 0,
          processingTimeMs: Date.now() - startedAt,
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to import CSV",
        imported: 0,
        errors: [],
        totalRows: 0,
        processingTimeMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
