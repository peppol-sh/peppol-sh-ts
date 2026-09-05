import { describe, expect, it } from "vitest";
import { Peppol, PeppolNotFoundError } from "../index";
import { fetchStub, jsonResponse } from "./helpers";

const WEBHOOK = {
  id: "whk_abc123",
  url: "https://example.com/webhooks/peppol",
  events: ["document.delivered", "document.failed"],
  active: true,
  created_at: "2026-03-05T12:00:00.000Z",
} as const;

function client(...responses: Array<Response | Error>) {
  const fetch = fetchStub(...responses);
  return {
    fetch,
    peppol: new Peppol({ apiKey: "ps_test_abc", fetch, maxRetries: 0 }),
  };
}

describe("webhooks.list()", () => {
  it("GETs /v1/webhooks for the workspace and returns the data envelope", async () => {
    const { fetch, peppol } = client(jsonResponse({ data: [WEBHOOK] }));

    const page = await peppol.webhooks.list();

    expect(page).toEqual({ data: [WEBHOOK] });
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/webhooks");
    expect(fetch.calls[0].body).toBeUndefined();
  });
});

describe("webhooks.create()", () => {
  it("POSTs /v1/webhooks with the body and returns the webhook plus its secret", async () => {
    const created = { ...WEBHOOK, secret: "whsec_s3cret" };
    const { fetch, peppol } = client(jsonResponse(created, 201));

    const webhook = await peppol.webhooks.create({
      url: "https://example.com/webhooks/peppol",
      events: ["document.delivered", "document.failed"],
    });

    expect(webhook).toEqual(created);
    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/webhooks");
    expect(fetch.calls[0].headers.get("content-type")).toBe("application/json");
    expect(fetch.calls[0].body).toBe(
      '{"url":"https://example.com/webhooks/peppol","events":["document.delivered","document.failed"]}',
    );
  });
});

describe("webhooks.get()", () => {
  it("GETs /v1/webhooks/{id} and returns the webhook", async () => {
    const { fetch, peppol } = client(jsonResponse(WEBHOOK));

    const webhook = await peppol.webhooks.get("whk_abc123");

    expect(webhook).toEqual(WEBHOOK);
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/webhooks/whk_abc123",
    );
  });

  it("URL-encodes the id", async () => {
    const { fetch, peppol } = client(jsonResponse(WEBHOOK));

    await peppol.webhooks.get("whk a/b");

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/webhooks/whk%20a%2Fb",
    );
  });
});

describe("webhooks.delete()", () => {
  it("DELETEs /v1/webhooks/{id} and returns the deleted marker", async () => {
    const { fetch, peppol } = client(jsonResponse({ deleted: true }));

    await expect(peppol.webhooks.delete("whk_abc123")).resolves.toEqual({
      deleted: true,
    });

    expect(fetch.calls[0].method).toBe("DELETE");
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/webhooks/whk_abc123",
    );
    expect(fetch.calls[0].body).toBeUndefined();
  });
});

describe("webhooks.listDeliveries()", () => {
  const PAGE = {
    data: [
      {
        id: "whd_1",
        webhook_id: "whk_abc123",
        document_id: "doc_1",
        event: "document.delivered",
        status: "delivered",
        status_code: 200,
        attempts: 1,
        last_error: null,
        next_retry_at: null,
        delivered_at: "2026-03-05T12:00:01.000Z",
        created_at: "2026-03-05T12:00:00.000Z",
      },
    ],
    has_more: true,
    next_cursor: "whd_1",
  } as const;

  it("GETs /v1/webhooks/{id}/deliveries and returns the page", async () => {
    const { fetch, peppol } = client(jsonResponse(PAGE));

    const page = await peppol.webhooks.listDeliveries("whk_abc123");

    expect(page).toEqual(PAGE);
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/webhooks/whk_abc123/deliveries",
    );
  });

  it("passes limit and cursor through as query params", async () => {
    const { fetch, peppol } = client(jsonResponse(PAGE));

    await peppol.webhooks.listDeliveries("whk_abc123", {
      limit: 100,
      cursor: "whd_1",
    });

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/webhooks/whk_abc123/deliveries?limit=100&cursor=whd_1",
    );
  });
});

describe("webhooks.test()", () => {
  it("POSTs /v1/webhooks/{id}/test with no body and returns the receiver's result", async () => {
    const result = {
      delivery_id: "whd_2",
      success: true,
      status_code: 200,
      error: null,
    };
    const { fetch, peppol } = client(jsonResponse(result));

    await expect(peppol.webhooks.test("whk_abc123")).resolves.toEqual(result);

    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/webhooks/whk_abc123/test",
    );
    expect(fetch.calls[0].body).toBeUndefined();
  });
});

describe("webhooks.rotateSecret()", () => {
  it("POSTs /v1/webhooks/{id}/rotate-secret and returns the new secret", async () => {
    const result = {
      id: "whk_abc123",
      url: "https://example.com/webhooks/peppol",
      secret: "whsec_n3w",
      secret_overlap_expires_at: 1772798400,
    };
    const { fetch, peppol } = client(jsonResponse(result));

    await expect(peppol.webhooks.rotateSecret("whk_abc123")).resolves.toEqual(
      result,
    );

    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/webhooks/whk_abc123/rotate-secret",
    );
    expect(fetch.calls[0].body).toBeUndefined();
  });
});

describe("error pass-through", () => {
  it("lets the transport's mapped error surface out of a method", async () => {
    const { peppol } = client(
      jsonResponse(
        {
          error: {
            type: "not_found",
            code: "webhook_not_found",
            message: "Webhook whk_abc123 not found",
            param: "id",
          },
        },
        404,
      ),
    );

    const thrown = await peppol.webhooks
      .get("whk_abc123")
      .catch((err: unknown) => err);

    expect(thrown).toBeInstanceOf(PeppolNotFoundError);
    expect((thrown as PeppolNotFoundError).code).toBe("webhook_not_found");
  });
});
