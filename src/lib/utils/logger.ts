import * as Sentry from "@sentry/nextjs";
import {
  AuthError,
  DeadlineCalculationError,
  NarrativeGenerationError,
  ResourceNotFoundError,
  TenancyViolationError,
} from "@/lib/utils/errors";

type LogLevel = "info" | "warn" | "error";

export type LogContext = {
  firmId?: string;
  userId?: string;
  entityId?: string;
  service?: string;
  jobName?: string;
  stateCode?: string;
  sourceUrl?: string;
  error?: unknown;
};

const SENSITIVE_KEY_PATTERN =
  /encryption|api[_-]?key|token|jwt|authorization|cookie|password|secret|ein|accountnumber|account_number|prompt/i;

const SENSITIVE_VALUE_PATTERN =
  /(sk_|pk_|xoxb-|xoxp-|bearer\s+[a-z0-9._-]{10,}|eyJ[a-zA-Z0-9_-]{10,})/i;

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (SENSITIVE_VALUE_PATTERN.test(value)) {
      return "[REDACTED]";
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const out: Record<string, unknown> = {};
    for (const [key, inner] of entries) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactValue(inner);
      }
    }
    return out;
  }

  return value;
}

function normalizeError(error: unknown): Error | null {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  return null;
}

function sentryLevelForError(error: Error): Sentry.SeverityLevel | null {
  if (error instanceof ResourceNotFoundError) return null;
  if (error instanceof TenancyViolationError) return "fatal";
  if (error instanceof NarrativeGenerationError) return "warning";
  if (error instanceof DeadlineCalculationError) return "error";
  if (error instanceof AuthError) return "info";
  return "error";
}

export function log(level: LogLevel, message: string, context: LogContext = {}): void {
  const error = normalizeError(context.error);
  const safeContext = redactValue({
    ...context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        }
      : undefined,
  }) as Record<string, unknown>;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...safeContext,
  };

  // Console output in JSON for both dev/prod (Vercel captures stdout).
  console.log(JSON.stringify(payload));

  if (!error) return;
  if (process.env.NODE_ENV !== "production") return;

  const sentryLevel = sentryLevelForError(error);
  if (!sentryLevel) return;

  Sentry.captureException(error, {
    level: sentryLevel,
    tags: {
      service: context.service ?? "unknown",
      jobName: context.jobName ?? "none",
    },
    extra: redactValue(context) as Record<string, unknown>,
  });
}
