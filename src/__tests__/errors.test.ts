import { describe, expect, it } from "vitest";
import {
  Peppol,
  PeppolApiError,
  PeppolAuthenticationError,
  PeppolConflictError,
  PeppolNotFoundError,
  PeppolPermissionError,
  PeppolRateLimitError,
  PeppolServerError,
  PeppolValidationError,
} from "../index";
import { fetchStub, jsonResponse } from "./helpers";

// maxRetries: 0 keeps these tests about status→class mapping alone; the retry
// policy has its own suite.
function client(...responses: Array<Response | Error>) {
  const fetch = fetchStub(...responses);
  return {
    fetch,
    peppol: new Peppol({ apiKey: "ps_test_abc", fetch, maxRetries: 0 }),
  };
}

describe("error mapping", () => {
  it("maps 404 to PeppolNotFoundError carrying the envelope and request id", async () => {
    const { peppol } = client(
      jsonResponse(
        {
          error: {
            type: "not_found",
            code: "company_not_found",
            message: "Company does not exist or caller cannot see it.",
          },
        },
        404,
        { "x-request-id": "req_123" },
      ),
    );

    const thrown = await peppol.health().catch((err: unknown) => err);

    expect(thrown).toBeInstanceOf(PeppolNotFoundError);
    expect(thrown).toBeInstanceOf(PeppolApiError);
    const err = thrown as PeppolNotFoundError;
    expect(err.status).toBe(404);
    expect(err.type).toBe("not_found");
    expect(err.code).toBe("company_not_found");
    expect(err.message).toBe("Company does not exist or caller cannot see it.");
    expect(err.requestId).toBe("req_123");
  });

  it.each([
    [400, PeppolValidationError],
    [422, PeppolValidationError],
    [401, PeppolAuthenticationError],
    [403, PeppolPermissionError],
    [409, PeppolConflictError],
    [429, PeppolRateLimitError],
    [500, PeppolServerError],
    [503, PeppolServerError],
    [402, PeppolApiError],
  ])("maps HTTP %i to the matching error class", async (status, expected) => {
    const { peppol } = client(
      jsonResponse(
        {
          error: {
            type: "internal_error",
            code: "internal_error",
            message: "boom",
          },
        },
        status,
      ),
    );

    const thrown = await peppol.health().catch((err: unknown) => err);

    expect(thrown).toBeInstanceOf(expected);
    expect((thrown as PeppolApiError).status).toBe(status);
  });

  it("carries param and details through from the envelope", async () => {
    const { peppol } = client(
      jsonResponse(
        {
          error: {
            type: "validation_error",
            code: "invalid_field",
            message: "A field is present but has an invalid value or format.",
            param: "lines[0].unit_price",
            details: { issues: ["expected number"] },
          },
        },
        400,
      ),
    );

    const err = (await peppol
      .health()
      .catch((e: unknown) => e)) as PeppolValidationError;

    expect(err.param).toBe("lines[0].unit_price");
    expect(err.details).toEqual({ issues: ["expected number"] });
  });

  it("does not crash on a non-JSON error body", async () => {
    const { peppol } = client(
      new Response("<html>502 Bad Gateway</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      }),
    );

    const err = (await peppol
      .health()
      .catch((e: unknown) => e)) as PeppolServerError;

    expect(err).toBeInstanceOf(PeppolServerError);
    expect(err.status).toBe(502);
    expect(err.code).toBe("unknown_error");
    expect(err.message).toBe("<html>502 Bad Gateway</html>");
  });

  it("falls back to an HTTP status message when the error body is empty", async () => {
    const { peppol } = client(new Response("", { status: 500 }));

    const err = (await peppol
      .health()
      .catch((e: unknown) => e)) as PeppolServerError;

    expect(err).toBeInstanceOf(PeppolServerError);
    expect(err.message).toBe("HTTP 500");
  });
});
