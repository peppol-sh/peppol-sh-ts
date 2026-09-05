import type { RequestFn } from "../client";
import type { paths } from "../generated/types";

type EventsPath = paths["/v1/events"];

/** A cursor-paginated page of document events. */
export type EventList =
  EventsPath["get"]["responses"][200]["content"]["application/json"];

/** A document event enriched with its document and company context. */
export type EventWithContext = EventList["data"][number];

/** Query for `events.list()`: filters plus `cursor` and `limit`. */
export type EventListParams = NonNullable<
  EventsPath["get"]["parameters"]["query"]
>;

/** `/v1/events` endpoints — the workspace event log behind webhook deliveries. */
export class Events {
  readonly request: RequestFn;

  constructor(request: RequestFn) {
    this.request = request;
  }

  /**
   * `GET /v1/events` — one page of the workspace event feed, newest first.
   * Follow `next_cursor` while `has_more` is true to walk the whole feed.
   */
  list(params?: EventListParams): Promise<EventList> {
    return this.request<EventList>({
      method: "GET",
      path: "/v1/events",
      query: params,
    });
  }
}
