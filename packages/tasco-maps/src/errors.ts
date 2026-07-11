import type { ErrorResponse } from "./schemas.js";

export type TascoMapsErrorCode =
  | "invalid_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "timeout"
  | "rate_limited"
  | "internal_error"
  | "service_unavailable"
  | "malformed_response"
  | "degraded";

export class TascoMapsError extends Error {
  readonly code: TascoMapsErrorCode;
  readonly requestId: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly degraded: boolean;
  readonly details?: Record<string, unknown>;

  constructor(options: {
    readonly code: TascoMapsErrorCode;
    readonly message: string;
    readonly requestId: string;
    readonly status: number;
    readonly retryable?: boolean;
    readonly degraded?: boolean;
    readonly details?: Record<string, unknown>;
  }) {
    super(options.message);
    this.name = "TascoMapsError";
    this.code = options.code;
    this.requestId = options.requestId;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.degraded = options.degraded ?? false;
    if (options.details !== undefined) this.details = options.details;
  }

  static fromErrorResponse(status: number, body: ErrorResponse): TascoMapsError {
    const code = body.error.code as TascoMapsErrorCode;
    return new TascoMapsError({
      code,
      message: body.error.message,
      requestId: body.requestId,
      status,
      retryable: code === "rate_limited" || code === "timeout" || code === "service_unavailable",
      degraded: code === "service_unavailable" || code === "timeout",
      ...(body.error.details ? { details: body.error.details } : {}),
    });
  }
}

export function isTascoMapsError(value: unknown): value is TascoMapsError {
  return value instanceof TascoMapsError;
}
