import type { components } from "./generated/types";

/** The canonical error envelope every non-2xx response carries. */
export type ErrorEnvelope = components["schemas"]["ErrorObject"];

/** The `error.type` taxonomy from the OpenAPI contract. */
export type PeppolErrorType = ErrorEnvelope["error"]["type"];

/** Base class for every error the SDK throws. */
export class PeppolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PeppolError";
  }
}

/** The request never reached the API: DNS, TLS, or socket failure. */
export class PeppolConnectionError extends PeppolError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "PeppolConnectionError";
    if (options && "cause" in options) this.cause = options.cause;
  }
}

/** The client gave up waiting before the API answered. */
export class PeppolTimeoutError extends PeppolError {
  /** The timeout that elapsed, in milliseconds. */
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = "PeppolTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export interface PeppolApiErrorInit {
  status: number;
  type: string;
  code: string;
  message: string;
  param?: string;
  details?: unknown;
  requestId?: string;
}

/** An error the API returned. Subclasses narrow it by HTTP status. */
export class PeppolApiError extends PeppolError {
  readonly status: number;
  readonly type: string;
  readonly code: string;
  readonly param?: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(init: PeppolApiErrorInit) {
    super(init.message);
    this.name = "PeppolApiError";
    this.status = init.status;
    this.type = init.type;
    this.code = init.code;
    this.param = init.param;
    this.details = init.details;
    this.requestId = init.requestId;
  }
}

/** HTTP 400 / 422 — the request body or query failed validation. */
export class PeppolValidationError extends PeppolApiError {
  constructor(init: PeppolApiErrorInit) {
    super(init);
    this.name = "PeppolValidationError";
  }
}

/** HTTP 401 — the API key is missing, malformed, or unknown. */
export class PeppolAuthenticationError extends PeppolApiError {
  constructor(init: PeppolApiErrorInit) {
    super(init);
    this.name = "PeppolAuthenticationError";
  }
}

/** HTTP 403 — authenticated, but not allowed to do this. */
export class PeppolPermissionError extends PeppolApiError {
  constructor(init: PeppolApiErrorInit) {
    super(init);
    this.name = "PeppolPermissionError";
  }
}

/** HTTP 404 — the resource does not exist, or is not visible to this key. */
export class PeppolNotFoundError extends PeppolApiError {
  constructor(init: PeppolApiErrorInit) {
    super(init);
    this.name = "PeppolNotFoundError";
  }
}

/** HTTP 409 — the request conflicts with the current state. */
export class PeppolConflictError extends PeppolApiError {
  constructor(init: PeppolApiErrorInit) {
    super(init);
    this.name = "PeppolConflictError";
  }
}

/** HTTP 429 — too many requests. */
export class PeppolRateLimitError extends PeppolApiError {
  /** Seconds to wait, from the `Retry-After` header, when the API sent one. */
  readonly retryAfter?: number;

  constructor(init: PeppolApiErrorInit & { retryAfter?: number }) {
    super(init);
    this.name = "PeppolRateLimitError";
    this.retryAfter = init.retryAfter;
  }
}

/** HTTP 5xx — the API failed to process an otherwise valid request. */
export class PeppolServerError extends PeppolApiError {
  constructor(init: PeppolApiErrorInit) {
    super(init);
    this.name = "PeppolServerError";
  }
}

/**
 * Turns a non-2xx response into the right error class. Never throws: a body
 * that is not the canonical envelope degrades to a generic message.
 */
export function errorFromResponse(
  status: number,
  headers: Headers,
  body: unknown,
  rawBody: string,
): PeppolApiError {
  const envelope =
    typeof body === "object" && body !== null && "error" in body
      ? (body as ErrorEnvelope).error
      : undefined;

  const init: PeppolApiErrorInit = {
    status,
    type: envelope?.type ?? "internal_error",
    code: envelope?.code ?? "unknown_error",
    message: envelope?.message || rawBody.trim() || `HTTP ${status}`,
    param: envelope?.param,
    details: envelope?.details,
    requestId: headers.get("x-request-id") ?? undefined,
  };

  switch (status) {
    case 400:
    case 422:
      return new PeppolValidationError(init);
    case 401:
      return new PeppolAuthenticationError(init);
    case 403:
      return new PeppolPermissionError(init);
    case 404:
      return new PeppolNotFoundError(init);
    case 409:
      return new PeppolConflictError(init);
    case 429:
      return new PeppolRateLimitError({
        ...init,
        retryAfter: parseRetryAfter(headers.get("retry-after")),
      });
    default:
      return status >= 500
        ? new PeppolServerError(init)
        : new PeppolApiError(init);
  }
}

/** Reads a `Retry-After` header as whole seconds. Ignores HTTP-date form. */
export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value.trim());
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}
