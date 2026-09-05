import type { RequestFn } from "../client";
import type { paths } from "../generated/types";

/** The authenticated account, its key prefixes, and aggregate usage. */
export type AccountDetails =
  paths["/v1/account"]["get"]["responses"][200]["content"]["application/json"];

/** Body of `POST /v1/account/keys`. */
export type CreateKeyParams =
  paths["/v1/account/keys"]["post"]["requestBody"]["content"]["application/json"];

/** A newly created key — the only time the full key is returned. */
export type ApiKeyCreated =
  paths["/v1/account/keys"]["post"]["responses"][201]["content"]["application/json"];

/** Result of `DELETE /v1/account/keys/{prefix}`. */
export type KeyRevoked =
  paths["/v1/account/keys/{prefix}"]["delete"]["responses"][200]["content"]["application/json"];

/** Query of `GET /v1/account/audit`. */
export type ListAuditEventsParams = NonNullable<
  paths["/v1/account/audit"]["get"]["parameters"]["query"]
>;

/** One page of audit events. */
export type AuditEventPage =
  paths["/v1/account/audit"]["get"]["responses"][200]["content"]["application/json"];

/** Query of `GET /v1/account/usage`. */
export type GetUsageParams = NonNullable<
  paths["/v1/account/usage"]["get"]["parameters"]["query"]
>;

/** Daily usage statistics plus period totals. */
export type Usage =
  paths["/v1/account/usage"]["get"]["responses"][200]["content"]["application/json"];

/** `/v1/account` endpoints — the authenticated account and its API keys. */
export class Account {
  readonly request: RequestFn;

  constructor(request: RequestFn) {
    this.request = request;
  }

  /** `GET /v1/account` — profile, key prefixes, and usage totals. */
  get(): Promise<AccountDetails> {
    return this.request<AccountDetails>({ method: "GET", path: "/v1/account" });
  }

  /**
   * `POST /v1/account/keys` — creates an extra API key. The full key comes
   * back once and is never retrievable again.
   */
  createKey(params: CreateKeyParams = {}): Promise<ApiKeyCreated> {
    return this.request<ApiKeyCreated>({
      method: "POST",
      path: "/v1/account/keys",
      body: params,
    });
  }

  /** `DELETE /v1/account/keys/{prefix}` — revokes a key for good. */
  revokeKey(prefix: string): Promise<KeyRevoked> {
    return this.request<KeyRevoked>({
      method: "DELETE",
      path: `/v1/account/keys/${encodeURIComponent(prefix)}`,
    });
  }

  /** `GET /v1/account/audit` — audit events across every workspace joined. */
  listAuditEvents(params?: ListAuditEventsParams): Promise<AuditEventPage> {
    return this.request<AuditEventPage>({
      method: "GET",
      path: "/v1/account/audit",
      query: params,
    });
  }

  /** `GET /v1/account/usage` — daily documents and API calls. */
  getUsage(params?: GetUsageParams): Promise<Usage> {
    return this.request<Usage>({
      method: "GET",
      path: "/v1/account/usage",
      query: params,
    });
  }
}
