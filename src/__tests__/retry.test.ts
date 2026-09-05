import { describe, expect, it } from "vitest";
import {
  Peppol,
  PeppolConnectionError,
  PeppolRateLimitError,
  PeppolServerError,
} from "../index";
import { fetchStub, jsonResponse } from "./helpers";

const HEALTH_OK = {
  status: "ok",
  version: "2.0.0",
  environment: "production",
  checks: { db: "ok" },
} as const;

const SERVER_ERROR = {
  error: {
    type: "internal_error",
    code: "internal_error",
    message: "Unexpected server error.",
  },
};

const RATE_LIMITED = {
  error: {
    type: "rate_limit_error",
    code: "rate_limited",
    message: "Too many requests.",
  },
};

const noSleep = async () => {};

describe("retry policy", () => {
  it("retries a 5xx GET and resolves once the API recovers", async () => {
    const sleeps: number[] = [];
    const fetch = fetchStub(
      jsonResponse(SERVER_ERROR, 500),
      jsonResponse(HEALTH_OK),
    );
    const peppol = new Peppol({
      apiKey: "ps_test_abc",
      fetch,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    await expect(peppol.health()).resolves.toEqual(HEALTH_OK);

    expect(fetch.calls).toHaveLength(2);
    expect(sleeps).toHaveLength(1);
  });

  it("gives up after maxRetries attempts and throws the last error", async () => {
    const fetch = fetchStub(jsonResponse(SERVER_ERROR, 500));
    const peppol = new Peppol({ apiKey: "ps_test_abc", fetch, sleep: noSleep });

    await expect(peppol.health()).rejects.toBeInstanceOf(PeppolServerError);

    // 1 initial attempt + the 2 default retries.
    expect(fetch.calls).toHaveLength(3);
  });

  it("waits the Retry-After seconds the API asked for on a 429", async () => {
    const sleeps: number[] = [];
    const fetch = fetchStub(
      jsonResponse(RATE_LIMITED, 429, { "retry-after": "1" }),
      jsonResponse(HEALTH_OK),
    );
    const peppol = new Peppol({
      apiKey: "ps_test_abc",
      fetch,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    await expect(peppol.health()).resolves.toEqual(HEALTH_OK);

    expect(sleeps).toEqual([1000]);
  });

  it("retries a 429 for a non-GET method, because the request was never processed", async () => {
    const fetch = fetchStub(
      jsonResponse(RATE_LIMITED, 429),
      jsonResponse({ id: "doc_1" }),
    );
    const peppol = new Peppol({ apiKey: "ps_test_abc", fetch, sleep: noSleep });

    const result = await peppol.documents.request({
      method: "POST",
      path: "/v1/documents",
      body: { number: "INV-001" },
    });

    expect(result).toEqual({ id: "doc_1" });
    expect(fetch.calls).toHaveLength(2);
  });

  it("does not retry a 5xx for a non-GET method, because it may have been applied", async () => {
    const fetch = fetchStub(jsonResponse(SERVER_ERROR, 500));
    const peppol = new Peppol({ apiKey: "ps_test_abc", fetch, sleep: noSleep });

    await expect(
      peppol.documents.request({
        method: "POST",
        path: "/v1/documents",
        body: { number: "INV-001" },
      }),
    ).rejects.toBeInstanceOf(PeppolServerError);

    expect(fetch.calls).toHaveLength(1);
  });

  it("retries a network failure on GET, then reports it as a PeppolConnectionError", async () => {
    const fetch = fetchStub(new TypeError("fetch failed"));
    const peppol = new Peppol({ apiKey: "ps_test_abc", fetch, sleep: noSleep });

    const thrown = await peppol.health().catch((err: unknown) => err);

    expect(thrown).toBeInstanceOf(PeppolConnectionError);
    expect((thrown as PeppolConnectionError).message).toContain("fetch failed");
    expect(fetch.calls).toHaveLength(3);
  });

  it("does not retry a network failure on a non-GET method", async () => {
    const fetch = fetchStub(new TypeError("fetch failed"));
    const peppol = new Peppol({ apiKey: "ps_test_abc", fetch, sleep: noSleep });

    await expect(
      peppol.documents.request({
        method: "POST",
        path: "/v1/documents",
        body: {},
      }),
    ).rejects.toBeInstanceOf(PeppolConnectionError);

    expect(fetch.calls).toHaveLength(1);
  });

  it("surfaces the 429 as a PeppolRateLimitError with retryAfter once retries run out", async () => {
    const fetch = fetchStub(
      jsonResponse(RATE_LIMITED, 429, { "retry-after": "30" }),
    );
    const peppol = new Peppol({
      apiKey: "ps_test_abc",
      fetch,
      maxRetries: 0,
      sleep: noSleep,
    });

    const thrown = await peppol.health().catch((err: unknown) => err);

    expect(thrown).toBeInstanceOf(PeppolRateLimitError);
    expect((thrown as PeppolRateLimitError).retryAfter).toBe(30);
  });
});
