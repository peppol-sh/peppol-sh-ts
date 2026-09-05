import type { RequestFn } from "../client";
import type { paths } from "../generated/types";

type ParticipantPath = paths["/v1/lookup/{peppol_id}"];
type DnsPath = paths["/v1/lookup/{peppol_id}/dns"];

/** SML domain to query: `sml` for production, `smk` for test. Defaults to `sml`. */
export type SmlDomain = NonNullable<
  NonNullable<ParticipantPath["get"]["parameters"]["query"]>["domain"]
>;

/** Optional query for both lookup endpoints. */
export interface LookupOptions {
  /** SML domain to query. The API defaults to `sml` when omitted. */
  domain?: SmlDomain;
}

/** Full SMP resolution: supported document types and AS4 endpoints. */
export type SmpLookupResult =
  ParticipantPath["get"]["responses"][200]["content"]["application/json"];

/** NAPTR/SMP DNS layer only: hostname, resolved SMP URL, and domain used. */
export type DnsLookupResult =
  DnsPath["get"]["responses"][200]["content"]["application/json"];

/** `/v1/lookup` endpoints — resolve a Peppol participant via SML/SMP. */
export class Lookup {
  readonly request: RequestFn;

  constructor(request: RequestFn) {
    this.request = request;
  }

  /** `GET /v1/lookup/{peppol_id}` — resolve a participant through its SMP. */
  participant(
    peppolId: string,
    options?: LookupOptions,
  ): Promise<SmpLookupResult> {
    return this.request<SmpLookupResult>({
      method: "GET",
      path: `/v1/lookup/${encodeURIComponent(peppolId)}`,
      query: { domain: options?.domain },
    });
  }

  /** `GET /v1/lookup/{peppol_id}/dns` — resolve the NAPTR/SMP DNS layer only. */
  dns(peppolId: string, options?: LookupOptions): Promise<DnsLookupResult> {
    return this.request<DnsLookupResult>({
      method: "GET",
      path: `/v1/lookup/${encodeURIComponent(peppolId)}/dns`,
      query: { domain: options?.domain },
    });
  }
}
