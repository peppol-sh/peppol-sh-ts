import { describe, expect, it } from "vitest";
import DefaultExport, {
  Peppol,
  PeppolError,
  PeppolTimeoutError,
} from "../index";
import { fetchStub, jsonResponse } from "./helpers";

const HEALTH_OK = {
  status: "ok",
  version: "2.0.0",
  environment: "production",
  checks: { db: "ok" },
} as const;

describe("Peppol constructor", () => {
  it("is also the default export", () => {
    expect(DefaultExport).toBe(Peppol);
  });

  it("throws a PeppolError when the API key is missing", () => {
    let thrown: unknown;
    try {
      new Peppol({ apiKey: "" });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(PeppolError);
    expect((thrown as PeppolError).message).toBe("apiKey is required");
  });
});

describe("health()", () => {
  it("GETs /v1/health with auth and SDK headers and returns the parsed body", async () => {
    const fetch = fetchStub(jsonResponse(HEALTH_OK));
    const peppol = new Peppol({ apiKey: "ps_test_abc", fetch });

    const health = await peppol.health();

    expect(health).toEqual(HEALTH_OK);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/health");
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].headers.get("authorization")).toBe(
      "Bearer ps_test_abc",
    );
    expect(fetch.calls[0].headers.get("accept")).toBe("application/json");
    expect(fetch.calls[0].headers.get("x-peppol-sdk")).toBe(
      "@peppol-sh/sdk/0.1.0",
    );
    expect(fetch.calls[0].body).toBeUndefined();
  });

  it("tolerates a trailing slash on baseUrl", async () => {
    const fetch = fetchStub(jsonResponse(HEALTH_OK));
    const peppol = new Peppol({
      apiKey: "ps_test_abc",
      baseUrl: "https://sandbox.peppol.sh/",
      fetch,
    });

    await peppol.health();

    expect(fetch.calls[0].url).toBe("https://sandbox.peppol.sh/v1/health");
  });

  it("throws a PeppolTimeoutError when the API does not answer in time", async () => {
    const peppol = new Peppol({
      apiKey: "ps_test_abc",
      timeoutMs: 5,
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        }),
    });

    const thrown = await peppol.health().catch((err: unknown) => err);

    expect(thrown).toBeInstanceOf(PeppolTimeoutError);
    expect((thrown as PeppolTimeoutError).timeoutMs).toBe(5);
  });
});

describe("request transport", () => {
  function peppolWith(...responses: Array<Response | Error>) {
    const fetch = fetchStub(...responses);
    return {
      fetch,
      peppol: new Peppol({ apiKey: "ps_test_abc", fetch, maxRetries: 0 }),
    };
  }

  it("serializes a JSON body and sets content-type on a POST", async () => {
    const { fetch, peppol } = peppolWith(jsonResponse({ id: "doc_1" }));

    await peppol.documents.request({
      method: "POST",
      path: "/v1/documents",
      body: { company_id: "com_1", number: "INV-001" },
    });

    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].headers.get("content-type")).toBe("application/json");
    expect(fetch.calls[0].body).toBe(
      '{"company_id":"com_1","number":"INV-001"}',
    );
  });

  it("skips undefined and null query values and stringifies the rest", async () => {
    const { fetch, peppol } = peppolWith(jsonResponse({ data: [] }));

    await peppol.documents.request({
      method: "GET",
      path: "/v1/documents",
      query: {
        limit: 25,
        direction: "outbound",
        cursor: undefined,
        status: null,
      },
    });

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/documents?limit=25&direction=outbound",
    );
  });

  it("resolves to undefined for a 204 No Content", async () => {
    const { peppol } = peppolWith(new Response(null, { status: 204 }));

    await expect(
      peppol.webhooks.request({ method: "DELETE", path: "/v1/webhooks/whk_1" }),
    ).resolves.toBeUndefined();
  });

  it("returns the raw text for a non-JSON content type", async () => {
    const xml = '<?xml version="1.0"?><Invoice/>';
    const { peppol } = peppolWith(
      new Response(xml, {
        status: 200,
        headers: { "content-type": "application/xml" },
      }),
    );

    await expect(
      peppol.documents.request({
        method: "GET",
        path: "/v1/documents/doc_1/ubl",
      }),
    ).resolves.toBe(xml);
  });
});

describe("resource namespaces", () => {
  it("exposes one namespace per API resource, each wired to the transport", () => {
    const peppol = new Peppol({ apiKey: "ps_test_abc", fetch: fetchStub() });

    for (const name of [
      "account",
      "companies",
      "documents",
      "events",
      "kyc",
      "lookup",
      "validate",
      "webhooks",
      "workspaces",
    ] as const) {
      expect(typeof peppol[name].request).toBe("function");
    }
  });
});
