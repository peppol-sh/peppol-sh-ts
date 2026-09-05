import type { RequestFn } from "../client";
import type { paths } from "../generated/types";

type WebhooksPath = paths["/v1/webhooks"];
type WebhookPath = paths["/v1/webhooks/{id}"];
type DeliveriesPath = paths["/v1/webhooks/{id}/deliveries"];
type TestPath = paths["/v1/webhooks/{id}/test"];
type RotateSecretPath = paths["/v1/webhooks/{id}/rotate-secret"];

/** Every webhook in the workspace, in a `data` envelope. */
export type WebhookList =
  WebhooksPath["get"]["responses"][200]["content"]["application/json"];

/** A webhook subscription. The `secret` is only present on create and rotate. */
export type Webhook = WebhookList["data"][number];

/** Body for `webhooks.create()`: the endpoint URL and the events it wants. */
export type WebhookCreateParams =
  WebhooksPath["post"]["requestBody"]["content"]["application/json"];

/** What `webhooks.delete()` answers: `{ deleted: true }`. */
export type WebhookDeleted =
  WebhookPath["delete"]["responses"][200]["content"]["application/json"];

/** A cursor-paginated page of delivery attempts. */
export type WebhookDeliveryList =
  DeliveriesPath["get"]["responses"][200]["content"]["application/json"];

/** One delivery attempt for a webhook event. */
export type WebhookDelivery = NonNullable<WebhookDeliveryList["data"]>[number];

/** Query for `webhooks.listDeliveries()`: `limit` and `cursor`. */
export type WebhookDeliveryListParams = NonNullable<
  DeliveriesPath["get"]["parameters"]["query"]
>;

/** What the receiver answered to a synthetic `webhook.test` event. */
export type WebhookTestResult =
  TestPath["post"]["responses"][200]["content"]["application/json"];

/** The freshly minted signing secret and the overlap window it opened. */
export type WebhookRotateSecretResult =
  RotateSecretPath["post"]["responses"][200]["content"]["application/json"];

/** `/v1/webhooks` endpoints — workspace webhook endpoints and their secrets. */
export class Webhooks {
  readonly request: RequestFn;

  constructor(request: RequestFn) {
    this.request = request;
  }

  /** `GET /v1/webhooks` — every webhook configured for the workspace. */
  list(): Promise<WebhookList> {
    return this.request<WebhookList>({
      method: "GET",
      path: "/v1/webhooks",
    });
  }

  /**
   * `POST /v1/webhooks` — register a webhook. The response carries the signing
   * `secret` once; it is never returned again.
   */
  create(params: WebhookCreateParams): Promise<Webhook> {
    return this.request<Webhook>({
      method: "POST",
      path: "/v1/webhooks",
      body: params,
    });
  }

  /** `GET /v1/webhooks/{id}` — one webhook. Never carries the `secret`. */
  get(id: string): Promise<Webhook> {
    return this.request<Webhook>({
      method: "GET",
      path: `/v1/webhooks/${encodeURIComponent(id)}`,
    });
  }

  /** `DELETE /v1/webhooks/{id}` — retire a webhook. Answers `{ deleted: true }`. */
  delete(id: string): Promise<WebhookDeleted> {
    return this.request<WebhookDeleted>({
      method: "DELETE",
      path: `/v1/webhooks/${encodeURIComponent(id)}`,
    });
  }

  /** `GET /v1/webhooks/{id}/deliveries` — one page of the delivery log. */
  listDeliveries(
    id: string,
    params?: WebhookDeliveryListParams,
  ): Promise<WebhookDeliveryList> {
    return this.request<WebhookDeliveryList>({
      method: "GET",
      path: `/v1/webhooks/${encodeURIComponent(id)}/deliveries`,
      query: params,
    });
  }

  /** `POST /v1/webhooks/{id}/test` — dispatch a synthetic `webhook.test` event. */
  test(id: string): Promise<WebhookTestResult> {
    return this.request<WebhookTestResult>({
      method: "POST",
      path: `/v1/webhooks/${encodeURIComponent(id)}/test`,
    });
  }

  /**
   * `POST /v1/webhooks/{id}/rotate-secret` — mint a new signing secret. The
   * previous one keeps signing for a 24-hour overlap window.
   */
  rotateSecret(id: string): Promise<WebhookRotateSecretResult> {
    return this.request<WebhookRotateSecretResult>({
      method: "POST",
      path: `/v1/webhooks/${encodeURIComponent(id)}/rotate-secret`,
    });
  }
}
