import { describe, expect, it } from "vitest";
import { Peppol, PeppolValidationError } from "../index";
import { fetchStub, jsonResponse } from "./helpers";

/** The `Company` create shape from the spec's `201` example. */
const COMPANY = {
  id: "com_9fJ2kQ7bTx0Lm4Ne1Ry8",
  name: "Acme BV",
  workspace_id: "wsp_abc123def456",
  role: "owner",
  is_live: false,
  company_registration_id: "0123456789",
  tax_id: "BE0123456789",
  email: "billing@acme.be",
  country: "BE",
  address: {
    street: "Keizerslaan 1",
    city: "Brussels",
    postal_code: "1000",
  },
  iban: "BE68539007547034",
  peppol_id: "0208:0123456789",
  created_at: "2026-03-05T12:00:00.000Z",
} as const;

function client(...responses: Array<Response | Error>) {
  const fetch = fetchStub(...responses);
  return {
    fetch,
    peppol: new Peppol({ apiKey: "ps_test_abc", fetch, maxRetries: 0 }),
  };
}

describe("companies.create()", () => {
  it("POSTs the payload to /v1/companies and returns the created company", async () => {
    const { fetch, peppol } = client(jsonResponse(COMPANY, 201));

    const company = await peppol.companies.create({
      name: "Acme BV",
      country: "BE",
      company_registration_id: "0123456789",
    });

    expect(company).toEqual(COMPANY);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/companies");
    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].body).toBe(
      '{"name":"Acme BV","country":"BE","company_registration_id":"0123456789"}',
    );
  });
});

describe("companies.list()", () => {
  it("GETs /v1/companies and returns the data envelope", async () => {
    const body = {
      data: [
        {
          id: "com_9fJ2kQ7bTx0Lm4Ne1Ry8",
          name: "Acme BV",
          tax_id: "BE0123456789",
          country: "BE",
          is_live: true,
          workspace_id: "wsp_abc123def456",
          created_at: "2026-03-05T12:00:00Z",
        },
      ],
    };
    const { fetch, peppol } = client(jsonResponse(body));

    const companies = await peppol.companies.list();

    expect(companies).toEqual(body);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/companies");
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].body).toBeUndefined();
  });
});

const COMPANY_DETAIL = {
  id: "com_9fJ2kQ7bTx0Lm4Ne1Ry8",
  name: "Acme BV",
  workspace_id: "wsp_abc123def456",
  company_registration_id: "0123456789",
  tax_id: "BE0123456789",
  email: "billing@acme.be",
  country: "BE",
  address: {
    street: "Keizerslaan 1",
    city: "Brussels",
    postal_code: "1000",
  },
  iban: "BE68539007547034",
  peppol_id: "0208:0123456789",
  is_live: true,
  created_at: "2026-03-05T12:00:00.000Z",
  updated_at: "2026-03-06T09:30:00.000Z",
} as const;

describe("companies.get()", () => {
  it("GETs /v1/companies/{id} and returns the detail shape", async () => {
    const { fetch, peppol } = client(jsonResponse(COMPANY_DETAIL));

    const company = await peppol.companies.get("com_9fJ2kQ7bTx0Lm4Ne1Ry8");

    expect(company).toEqual(COMPANY_DETAIL);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/companies/com_9fJ2kQ7bTx0Lm4Ne1Ry8",
    );
    expect(fetch.calls[0].method).toBe("GET");
  });

  it("URL-encodes the id", async () => {
    const { fetch, peppol } = client(jsonResponse(COMPANY_DETAIL));

    await peppol.companies.get("com_a/b?c");

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/companies/com_a%2Fb%3Fc",
    );
  });
});

describe("companies.update()", () => {
  it("PATCHes /v1/companies/{id} with the changed fields only", async () => {
    const { fetch, peppol } = client(jsonResponse(COMPANY_DETAIL));

    const company = await peppol.companies.update("com_9fJ2kQ7bTx0Lm4Ne1Ry8", {
      name: "Acme BV (new name)",
      tax_id: "BE0123456789",
    });

    expect(company).toEqual(COMPANY_DETAIL);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/companies/com_9fJ2kQ7bTx0Lm4Ne1Ry8",
    );
    expect(fetch.calls[0].method).toBe("PATCH");
    expect(fetch.calls[0].headers.get("content-type")).toBe("application/json");
    expect(fetch.calls[0].body).toBe(
      '{"name":"Acme BV (new name)","tax_id":"BE0123456789"}',
    );
  });
});

describe("error pass-through", () => {
  it("throws the mapped API error instead of resolving", async () => {
    const { peppol } = client(
      jsonResponse(
        {
          error: {
            type: "validation_error",
            code: "invalid_country",
            message: "Country FR is not supported for Peppol",
            param: "country",
          },
        },
        400,
      ),
    );

    const thrown = await peppol.companies
      .create({ name: "Acme SARL", country: "FR" })
      .catch((err: unknown) => err);

    expect(thrown).toBeInstanceOf(PeppolValidationError);
    expect((thrown as PeppolValidationError).code).toBe("invalid_country");
  });
});
