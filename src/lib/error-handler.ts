/**
 * Global error handling utilities for VotrIA
 * Structured error types, logging, and Sentry integration
 */

export class VotrIAError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "VotrIAError";
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

// Specific error types
export class PlanLimitError extends VotrIAError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "PLAN_LIMIT_EXCEEDED", 429, context);
    this.name = "PlanLimitError";
  }
}

export class AgentError extends VotrIAError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "AGENT_ERROR", 500, context);
    this.name = "AgentError";
  }
}

export class AuthError extends VotrIAError {
  constructor(message: string) {
    super(message, "AUTH_ERROR", 401);
    this.name = "AuthError";
  }
}

export class ValidationError extends VotrIAError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, context);
    this.name = "ValidationError";
  }
}

export class IntegrationError extends VotrIAError {
  constructor(service: string, message: string, context?: Record<string, unknown>) {
    super(`${service}: ${message}`, "INTEGRATION_ERROR", 502, { service, ...context });
    this.name = "IntegrationError";
  }
}

/**
 * Structured error logger
 * In production, this sends to Sentry. In dev, console.error.
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const errorInfo = normalizeError(error);

  if (process.env.NODE_ENV === "production") {
    // TODO: Sentry.captureException(error, { extra: { ...errorInfo, ...context } });
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      ...errorInfo,
      ...context,
    }));
  } else {
    console.error("[VotrIA Error]", errorInfo.message, context ?? "");
  }
}

function normalizeError(error: unknown): {
  message: string;
  code: string;
  stack?: string;
} {
  if (error instanceof VotrIAError) {
    return {
      message: error.message,
      code: error.code,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: "UNKNOWN_ERROR",
      stack: error.stack,
    };
  }

  return {
    message: String(error),
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Safe JSON response for API errors
 */
export function errorResponse(error: unknown): {
  error: string;
  code: string;
  statusCode: number;
} {
  if (error instanceof VotrIAError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  // Don't leak internal errors in production
  if (process.env.NODE_ENV === "production") {
    return {
      error: "Une erreur interne est survenue.",
      code: "INTERNAL_ERROR",
      statusCode: 500,
    };
  }

  return {
    error: error instanceof Error ? error.message : "Unknown error",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  };
}

/**
 * Retry wrapper with exponential backoff
 * For external API calls (Claude, Gmail, Stripe)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, label = "operation" } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        logError(error, { label, attempt, maxRetries });
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[Retry] ${label} attempt ${attempt}/${maxRetries}, retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Unreachable");
}
