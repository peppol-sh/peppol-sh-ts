import { describe, expect, it } from "vitest";
import { Peppol } from "../index";
import type { ValidateDocumentParams } from "../resources/validate";
import { fetchStub, jsonResponse } from "./helpers";

/**
 * The `invoice` request example from the spec, plus `currency` and `unit`.
 * The spec's `required` lists leave those out, but each carries a `default:`,
 * so the generated `DocumentCreate` type makes them non-optional.
 */
const PAYLOAD: ValidateDocumentParams = {
  company_id: "com_abc123",
  type: "invoice",
  number: "INV-2026-0001",
  issue_date: "2026-04-04",
  currency: "EUR",
  from: { name: "Acme BV", tax_id: "BE0123456789" },
  to: { name: "Globex NV", tax_id: "BE0987654321" },
  lines: [
    {
      description: "Consulting",
      quantity: 1,
      unit: "C62",
      unit_price: 1000,
      tax_rate: 21,
    },
  ],
};

function client(...responses: Array<Response | Error>) {
  const fetch = fetchStub(...responses);
  return {
    fetch,
    peppol: new Peppol({ apiKey: "ps_test_abc", fetch, maxRetries: 0 }),
  };
}

describe("validate.document()", () => {
  it("POSTs the payload to /v1/validate and returns a passing result", async () => {
    const result = { valid: true, errors: [], warnings: [] };
    const { fetch, peppol } = client(jsonResponse(result));

    const validation = await peppol.validate.document(PAYLOAD);

    expect(validation).toEqual(result);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/validate");
    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].headers.get("content-type")).toBe("application/json");
    expect(fetch.calls[0].body).toBe(JSON.stringify(PAYLOAD));
  });

  it("returns the field-level errors and warnings of a failing result", async () => {
    const result = {
      valid: false,
      errors: [
        {
          path: "buyer.tax_id",
          code: "invalid_format",
          message: "VAT number is not in a valid format",
        },
      ],
      warnings: [
        {
          path: "lines[0].description",
          code: "short_description",
          message: "Description is unusually short",
        },
      ],
    };
    const { peppol } = client(jsonResponse(result));

    await expect(peppol.validate.document(PAYLOAD)).resolves.toEqual(result);
  });
});
