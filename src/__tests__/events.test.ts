import { describe, expect, it } from "vitest";
import { Peppol } from "../index";
import { fetchStub, jsonResponse } from "./helpers";

const PAGE = {
  data: [
    {
      id: "evt_1",
      document_id: "doc_1",
      document_number: "INV-001",
      recipient: "Acme NV",
      company_id: "com_1",
      company_name: "Nova Trading",
      type: "delivered",
      from_status: "sending",
      to_status: "delivered",
      message: null,
      created_at: "2026-03-05T12:00:00.000Z",
    },
  ],
  has_more: true,
  next_cursor: "evt_1",
} as const;

function client(...responses: Array<Response | Error>) {
  const fetch = fetchStub(...responses);
  return {
    fetch,
    peppol: new Peppol({ apiKey: "ps_test_abc", fetch, maxRetries: 0 }),
  };
}

describe("events.list()", () => {
  it("GETs /v1/events with no query and returns the page", async () => {
    const { fetch, peppol } = client(jsonResponse(PAGE));

    const page = await peppol.events.list();

    expect(page).toEqual(PAGE);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/events");
    expect(fetch.calls[0].body).toBeUndefined();
  });

  it("passes every documented filter through as a query param", async () => {
    const { fetch, peppol } = client(jsonResponse(PAGE));

    await peppol.events.list({
      company_id: "com_1",
      type: "delivered",
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-31T23:59:59.000Z",
      document_id: "doc_1",
      q: "INV-001",
      cursor: "evt_9",
      limit: 100,
    });

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/events?company_id=com_1&type=delivered" +
        "&from=2026-03-01T00%3A00%3A00.000Z&to=2026-03-31T23%3A59%3A59.000Z" +
        "&document_id=doc_1&q=INV-001&cursor=evt_9&limit=100",
    );
  });
});
