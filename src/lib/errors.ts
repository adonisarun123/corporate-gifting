/**
 * Consistent error contract (spec §19): code, safe message, fieldErrors, requestId.
 * HTTP mapping: 401 unauthenticated, 403 denied, 404 not-found (when disclosure is inappropriate),
 * 409 concurrency/idempotency conflict, 422 business-rule failure, 429 rate limit.
 */
export type ErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "idempotency_conflict"
  | "validation_failed"
  | "business_rule"
  | "rate_limited"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  idempotency_conflict: 409,
  validation_failed: 422,
  business_rule: 422,
  rate_limited: 429,
  internal: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors: Record<string, string[]> | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, opts?: { fieldErrors?: Record<string, string[]>; details?: Record<string, unknown> }) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.fieldErrors = opts?.fieldErrors;
    this.details = opts?.details;
  }

  toJSON(requestId?: string) {
    return {
      code: this.code,
      message: this.message,
      fieldErrors: this.fieldErrors ?? {},
      requestId: requestId ?? null,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export const unauthenticated = (msg = "Sign in required") => new AppError("unauthenticated", msg);
export const forbidden = (msg = "You do not have permission to do this") => new AppError("forbidden", msg);
export const notFound = (msg = "Not found") => new AppError("not_found", msg);
export const conflict = (msg: string, details?: Record<string, unknown>) => new AppError("conflict", msg, { details });
export const businessRule = (msg: string, fieldErrors?: Record<string, string[]>) =>
  new AppError("business_rule", msg, { fieldErrors });
export const validationFailed = (fieldErrors: Record<string, string[]>, msg = "Validation failed") =>
  new AppError("validation_failed", msg, { fieldErrors });

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
