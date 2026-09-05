import { describe, expect, it } from "vitest";
import { Peppol } from "../index";
import { fetchStub, jsonResponse } from "./helpers";

const SMP_RESULT = {
  participant_id: { scheme: "0208", id: "0123456789" },
  domain: "sml",
  naptr_domain: "b-1a2b3c.iso6523-actorid-upis.edelivery.tech.ec.europa.eu",
  smp_url: "https://smp.example.be",
  services: [],
} as const;

function client(...responses: Array<Response | Error>) {
  const fetch = fetchStub(...responses);
  return {
    fetch,
    peppol: new Peppol({ apiKey: "ps_test_abc", fetch, maxRetries: 0 }),
  };
}

describe("lookup.participant()", () => {
  it("GETs /v1/lookup/{peppol_id} and returns the SMP result", async () => {
    const { fetch, peppol } = client(jsonResponse(SMP_RESULT));

    const result = await peppol.lookup.participant("0208:0123456789");

    expect(result).toEqual(SMP_RESULT);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].body).toBeUndefined();
  });

  it("URL-encodes the colon in the Peppol ID", async () => {
    const { fetch, peppol } = client(jsonResponse(SMP_RESULT));

    await peppol.lookup.participant("0208:0123456789");

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/lookup/0208%3A0123456789",
    );
  });

  it("sends the domain query parameter when given, and omits it otherwise", async () => {
    const { fetch, peppol } = client(jsonResponse(SMP_RESULT));

    await peppol.lookup.participant("0208:0123456789", { domain: "smk" });
    await peppol.lookup.participant("0208:0123456789");

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/lookup/0208%3A0123456789?domain=smk",
    );
    expect(fetch.calls[1].url).toBe(
      "https://api.peppol.sh/v1/lookup/0208%3A0123456789",
    );
  });
});

const DNS_RESULT = {
  peppol_id: "0208:0123456789",
  naptr_hostname: "b-1a2b3c.iso6523-actorid-upis.edelivery.tech.ec.europa.eu",
  smp_url: "https://smp.example.be",
  domain: "sml",
} as const;

describe("lookup.dns()", () => {
  it("GETs /v1/lookup/{peppol_id}/dns and returns the DNS result", async () => {
    const { fetch, peppol } = client(jsonResponse(DNS_RESULT));

    const result = await peppol.lookup.dns("0208:0123456789");

    expect(result).toEqual(DNS_RESULT);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/lookup/0208%3A0123456789/dns",
    );
    expect(fetch.calls[0].method).toBe("GET");
  });

  it("sends the domain query parameter when given", async () => {
    const { fetch, peppol } = client(jsonResponse(DNS_RESULT));

    await peppol.lookup.dns("0208:0123456789", { domain: "smk" });

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/lookup/0208%3A0123456789/dns?domain=smk",
    );
  });
});
