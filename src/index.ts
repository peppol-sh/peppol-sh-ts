import { Peppol } from "./client";

export { Peppol };
export default Peppol;

export type {
  FetchLike,
  Health,
  HttpMethod,
  PeppolOptions,
  QueryValue,
  RequestFn,
  RequestOptions,
} from "./client";
export {
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  SDK_VERSION,
} from "./client";
export type { ErrorEnvelope, PeppolErrorType } from "./errors";
export {
  PeppolApiError,
  PeppolAuthenticationError,
  PeppolConflictError,
  PeppolConnectionError,
  PeppolError,
  PeppolNotFoundError,
  PeppolPermissionError,
  PeppolRateLimitError,
  PeppolServerError,
  PeppolTimeoutError,
  PeppolValidationError,
} from "./errors";
/** Every schema, path, and operation type generated from the OpenAPI spec. */
export type * as ApiTypes from "./generated/types";
export type * from "./resources/account";
export { Account } from "./resources/account";
export type * from "./resources/companies";
export { Companies } from "./resources/companies";
export type * from "./resources/documents";
export { Documents } from "./resources/documents";
export type * from "./resources/events";
export { Events } from "./resources/events";
export type * from "./resources/kyc";
export { Kyc } from "./resources/kyc";
export type * from "./resources/lookup";
export { Lookup } from "./resources/lookup";
export type * from "./resources/validate";
export { Validate } from "./resources/validate";
export type * from "./resources/webhooks";
export { Webhooks } from "./resources/webhooks";
export type * from "./resources/workspaces";
export { Workspaces } from "./resources/workspaces";
