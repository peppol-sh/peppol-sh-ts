import { describe, expect, it } from "vitest";
import { Peppol, PeppolNotFoundError } from "../index";
import type {
  DocumentAccepted,
  DocumentSendParams,
} from "../resources/documents";
import { fetchStub, jsonResponse } from "./helpers";

/** A document body straight from the `sendDocument` example in openapi.yaml. */
const SEND_PARAMS: DocumentSendParams = {
  company_id: "com_abc123",
  type: "invoice",
  number: "INV-2026-001",
  issue_date: "2026-03-01",
  due_date: "2026-03-31",
  currency: "EUR",
  from: {
    name: "Acme BV",
    tax_id: "BE0123456789",
    address: {
      street: "Keizerslaan 1",
      city: "Brussels",
      postal_code: "1000",
      country: "BE",
    },
  },
  to: { name: "Client NV", tax_id: "BE0987654321" },
  lines: [
    {
      description: "API Integration Services",
      quantity: 1,
      unit: "C62",
      unit_price: 500,
      tax_rate: 21,
    },
  ],
};

const DOCUMENT = {
  id: "doc_a1b2c3d4",
  type: "invoice",
  number: "INV-2026-001",
  status: "queued",
  currency: "EUR",
  issue_date: "2026-03-01",
  due_date: "2026-03-31",
  subtotal: 500,
  tax_total: 105,
  total: 605,
};

/** What `POST /v1/documents` answers: a pointer to the queued document. */
const ACCEPTED: DocumentAccepted = {
  id: "doc_a1b2c3d4",
  status: "queued",
  url: "/v1/documents/doc_a1b2c3d4",
};

function client(...responses: Array<Response | Error>) {
  const fetch = fetchStub(...responses);
  return {
    fetch,
    peppol: new Peppol({ apiKey: "ps_test_abc", fetch, maxRetries: 0 }),
  };
}

describe("documents.send()", () => {
  it("POSTs the document to /v1/documents and returns the 202-accepted record", async () => {
    const { fetch, peppol } = client(jsonResponse(ACCEPTED, 202));

    const accepted = await peppol.documents.send(SEND_PARAMS);

    expect(accepted).toEqual(ACCEPTED);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/documents");
    expect(JSON.parse(fetch.calls[0].body as string)).toEqual(SEND_PARAMS);
  });

  // The API answers 200 instead of 202 when an idempotent replay returns the
  // record that already exists. Both statuses carry the same schema, so the
  // caller sees one `DocumentAccepted` type either way.
  it("returns the same shape on a 200 idempotent replay", async () => {
    const { peppol } = client(jsonResponse(ACCEPTED, 200));

    const replay: DocumentAccepted = await peppol.documents.send(SEND_PARAMS);

    expect(replay.url).toBe("/v1/documents/doc_a1b2c3d4");
  });

  it("sends the preceding invoice reference of a credit note in the body", async () => {
    const { fetch, peppol } = client(jsonResponse(ACCEPTED, 202));

    await peppol.documents.send({
      ...SEND_PARAMS,
      type: "credit_note",
      number: "CN-2026-001",
      preceding_invoice: { number: "INV-2026-001", issue_date: "2026-03-01" },
    });

    expect(JSON.parse(fetch.calls[0].body as string).preceding_invoice).toEqual(
      { number: "INV-2026-001", issue_date: "2026-03-01" },
    );
  });
});

describe("documents.send() with amount_due", () => {
  it("sends the amount due of a prepaid invoice in the body, also when it is 0", async () => {
    const { fetch, peppol } = client(jsonResponse(ACCEPTED, 202));

    await peppol.documents.send({ ...SEND_PARAMS, amount_due: 0 });

    expect(JSON.parse(fetch.calls[0].body as string).amount_due).toBe(0);
  });
});

describe("documents.sendBatch()", () => {
  it("POSTs the array to /v1/documents/batch and returns one result per input", async () => {
    const failure = {
      error: {
        type: "validation_error",
        code: "invalid_peppol_id",
        message: "Peppol ID is malformed",
        param: "to.peppol_id",
      },
    };
    const { fetch, peppol } = client(jsonResponse([ACCEPTED, failure], 202));

    const results = await peppol.documents.sendBatch([
      SEND_PARAMS,
      { ...SEND_PARAMS, number: "INV-2026-002" },
    ]);

    expect(results).toEqual([ACCEPTED, failure]);
    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/documents/batch");
    expect(JSON.parse(fetch.calls[0].body as string)).toEqual([
      SEND_PARAMS,
      { ...SEND_PARAMS, number: "INV-2026-002" },
    ]);
  });
});

describe("documents.list()", () => {
  const PAGE = {
    data: [DOCUMENT],
    has_more: true,
    next_cursor: "2026-03-01T10:00:00Z",
  };

  it("GETs /v1/documents with the filter and pagination query", async () => {
    const { fetch, peppol } = client(jsonResponse(PAGE));

    const page = await peppol.documents.list({
      company_id: "com_abc123",
      status: "delivered",
      limit: 50,
      cursor: "2026-02-01T10:00:00Z",
    });

    expect(page).toEqual(PAGE);
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/documents?company_id=com_abc123&status=delivered&limit=50&cursor=2026-02-01T10%3A00%3A00Z",
    );
  });

  it("sends only company_id when no other filter is given", async () => {
    const { fetch, peppol } = client(jsonResponse({ data: [] }));

    await peppol.documents.list({ company_id: "com_abc123" });

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/documents?company_id=com_abc123",
    );
  });
});

describe("documents.get()", () => {
  it("GETs /v1/documents/{id} with the company scope and returns the document", async () => {
    const { fetch, peppol } = client(jsonResponse(DOCUMENT));

    const document = await peppol.documents.get("doc_a1b2c3d4", {
      company_id: "com_abc123",
    });

    expect(document).toEqual(DOCUMENT);
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/documents/doc_a1b2c3d4?company_id=com_abc123",
    );
  });

  it("URL-encodes the document id", async () => {
    const { fetch, peppol } = client(jsonResponse(DOCUMENT));

    await peppol.documents.get("doc/a b", { company_id: "com_abc123" });

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/documents/doc%2Fa%20b?company_id=com_abc123",
    );
  });

  it("returns the preceding invoice reference of the document", async () => {
    const { peppol } = client(
      jsonResponse({
        ...DOCUMENT,
        type: "credit_note",
        preceding_invoice: { number: "INV-2026-001", issue_date: "2026-03-01" },
      }),
    );

    const document = await peppol.documents.get("doc_a1b2c3d4", {
      company_id: "com_abc123",
    });

    expect(document.preceding_invoice?.number).toBe("INV-2026-001");
    expect(document.preceding_invoice?.issue_date).toBe("2026-03-01");
  });

  it("returns the amount due of a prepaid document", async () => {
    const { peppol } = client(jsonResponse({ ...DOCUMENT, amount_due: 0 }));

    const document = await peppol.documents.get("doc_a1b2c3d4", {
      company_id: "com_abc123",
    });

    expect(document.amount_due).toBe(0);
  });
});

describe("documents.history()", () => {
  it("GETs /v1/documents/{id}/history and returns the event timeline", async () => {
    const events = [
      { event: "created", timestamp: "2026-03-01T10:00:00Z", detail: null },
      {
        event: "delivered",
        timestamp: "2026-03-01T10:00:05Z",
        detail: "Accepted by receiver",
      },
    ];
    const { fetch, peppol } = client(jsonResponse(events));

    const timeline = await peppol.documents.history("doc_a1b2c3d4");

    expect(timeline).toEqual(events);
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/documents/doc_a1b2c3d4/history",
    );
  });
});

describe("documents.ubl()", () => {
  it("GETs /v1/documents/{id}/ubl and returns the XML as a string", async () => {
    const xml = '<?xml version="1.0"?><Invoice/>';
    const { fetch, peppol } = client(
      new Response(xml, {
        status: 200,
        headers: { "content-type": "application/xml" },
      }),
    );

    const ubl = await peppol.documents.ubl("doc_a1b2c3d4");

    expect(ubl).toBe(xml);
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/documents/doc_a1b2c3d4/ubl",
    );
  });
});

describe("documents.listAttachments()", () => {
  it("GETs /v1/documents/{id}/attachments and returns the metadata envelope", async () => {
    const body = {
      data: [
        {
          id: "att_a1b2c3d4",
          filename: "terms.pdf",
          mime_type: "application/pdf",
          size_bytes: 20480,
          sha256:
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          created_at: "2026-03-01T10:00:00Z",
        },
      ],
    };
    const { fetch, peppol } = client(jsonResponse(body));

    const attachments = await peppol.documents.listAttachments("doc_a1b2c3d4");

    expect(attachments).toEqual(body);
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/documents/doc_a1b2c3d4/attachments",
    );
  });
});

describe("documents.getAttachment()", () => {
  it("GETs the attachment path and returns its raw bytes", async () => {
    const bytes = "%PDF-1.7 binary bytes";
    const { fetch, peppol } = client(
      new Response(bytes, {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      }),
    );

    const attachment = await peppol.documents.getAttachment(
      "doc_a1b2c3d4",
      "att_a1b2c3d4",
    );

    expect(attachment).toBe(bytes);
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/documents/doc_a1b2c3d4/attachments/att_a1b2c3d4",
    );
  });

  it("URL-encodes both path params", async () => {
    const { fetch, peppol } = client(new Response("", { status: 200 }));

    await peppol.documents.getAttachment("doc/1", "att 2");

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/documents/doc%2F1/attachments/att%202",
    );
  });

  it("surfaces a 404 envelope as a PeppolNotFoundError", async () => {
    const { peppol } = client(
      jsonResponse(
        {
          error: {
            type: "invalid_request_error",
            code: "attachment_not_found",
            message: "Attachment att_missing not found",
          },
        },
        404,
      ),
    );

    const thrown = await peppol.documents
      .getAttachment("doc_a1b2c3d4", "att_missing")
      .catch((err: unknown) => err);

    expect(thrown).toBeInstanceOf(PeppolNotFoundError);
    expect((thrown as PeppolNotFoundError).code).toBe("attachment_not_found");
  });
});
