import * as Sentry from "@sentry/nextjs";

type ErrorDetails = Record<string, unknown>;

class AppError extends Error {
  readonly statusCode: number;
  readonly details?: ErrorDetails;

  constructor(message: string, statusCode: number, details?: ErrorDetails) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class AuthError extends AppError {
  constructor(message = "Authentication required", details?: ErrorDetails) {
    super(message, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: ErrorDetails) {
    super(message, 403, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: ErrorDetails) {
    super(message, 400, details);
  }
}

export class TenancyViolationError extends AppError {
  constructor(message = "Tenant scope violation detected", details?: ErrorDetails) {
    super(message, 403, details);

    // Tenancy violations are always high-severity incidents.
    Sentry.captureException(this, {
      level: "fatal",
      tags: { errorType: "tenancy_violation" },
      extra: details,
    });
  }
}

export class PlanUpgradeRequiredError extends AppError {
  readonly upgradeUrl: string;
  readonly currentClientCount: number;
  readonly proThreshold: number;

  constructor(
    message = "Plan upgrade required",
    opts?: {
      upgradeUrl?: string;
      currentClientCount?: number;
      proThreshold?: number;
    },
  ) {
    const upgradeUrl = opts?.upgradeUrl ?? "/dashboard/billing";
    const currentClientCount = opts?.currentClientCount ?? 0;
    const proThreshold = opts?.proThreshold ?? 51;

    super(message, 402, {
      upgradeUrl,
      currentClientCount,
      proThreshold,
    });

    this.upgradeUrl = upgradeUrl;
    this.currentClientCount = currentClientCount;
    this.proThreshold = proThreshold;
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(message = "Resource not found", details?: ErrorDetails) {
    // Intentionally no Sentry alert for expected not-found cases.
    super(message, 404, details);
  }
}

export class NarrativeGenerationError extends AppError {
  constructor(message = "Narrative generation failed", details?: ErrorDetails) {
    super(message, 500, details);
  }
}

export class DeadlineCalculationError extends AppError {
  constructor(message = "Deadline calculation failed", details?: ErrorDetails) {
    super(message, 500, details);
  }
}

export { AppError };
