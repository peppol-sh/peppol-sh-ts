import { describe, expect, it } from "vitest";
import { Peppol } from "../index";
import { fetchStub, jsonResponse } from "./helpers";

const KYC_STATE = {
  status: "none",
  company_id: null,
  submitted_at: null,
  attestation: {
    name: null,
    role: null,
    version: null,
    current_version: "2026-08-26",
    text: "Workspace verification and mandate attestation",
  },
  documents: [],
  requirements: { has_company: false, can_submit: false },
} as const;

function client(...responses: Array<Response | Error>) {
  const fetch = fetchStub(...responses);
  return {
    fetch,
    peppol: new Peppol({ apiKey: "ps_test_abc", fetch, maxRetries: 0 }),
  };
}

describe("kyc.get()", () => {
  it("GETs /v1/kyc and returns the workspace KYC state", async () => {
    const { fetch, peppol } = client(jsonResponse(KYC_STATE));

    const state = await peppol.kyc.get();

    expect(state).toEqual(KYC_STATE);
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/kyc");
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].body).toBeUndefined();
  });
});

describe("kyc.uploadDocument()", () => {
  it("POSTs /v1/kyc/documents as JSON with base64 content", async () => {
    const stored = {
      id: "kyd_3aB7cD9eF1gH2iJ4kL6mN",
      company_id: null,
      doc_type: "registry_extract",
      filename: "kbo-extract.pdf",
      mime_type: "application/pdf",
      size_bytes: 184320,
    };
    const { fetch, peppol } = client(jsonResponse(stored, 201));

    const document = await peppol.kyc.uploadDocument({
      doc_type: "registry_extract",
      filename: "kbo-extract.pdf",
      content: "JVBERi0xLjcK",
      mime_type: "application/pdf",
    });

    expect(document).toEqual(stored);
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/kyc/documents");
    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].headers.get("content-type")).toBe("application/json");
    expect(fetch.calls[0].body).toBe(
      '{"doc_type":"registry_extract","filename":"kbo-extract.pdf","content":"JVBERi0xLjcK","mime_type":"application/pdf"}',
    );
  });

  it("sends the company pairing fields for a mandate document", async () => {
    const { fetch, peppol } = client(jsonResponse({ id: "kyd_9" }, 201));

    await peppol.kyc.uploadDocument({
      doc_type: "mandate",
      content: "JVBERi0xLjcK",
      company_id: "com_2mN4oP6qR8sT0uV2wX4yZ",
      mandate_grantor_name: "Marie Dubois",
    });

    expect(JSON.parse(fetch.calls[0].body ?? "")).toEqual({
      doc_type: "mandate",
      content: "JVBERi0xLjcK",
      company_id: "com_2mN4oP6qR8sT0uV2wX4yZ",
      mandate_grantor_name: "Marie Dubois",
    });
  });
});

describe("kyc.submit()", () => {
  it("POSTs /v1/kyc/submit with the attestation and returns the new state", async () => {
    const submitted = { ...KYC_STATE, status: "pending" };
    const { fetch, peppol } = client(jsonResponse(submitted));

    const state = await peppol.kyc.submit({
      company_id: "com_9fJ2kQ7bTx0Lm4Ne1Ry8",
      kyc_legal_name: "Acme Trading BV",
      kyc_enterprise_number: "0123.456.789",
      attestation_name: "Jan Janssens",
      attestation_role: "Managing Director",
      attested: true,
      attestation_version: "2026-08-26",
    });

    expect(state).toEqual(submitted);
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/kyc/submit");
    expect(fetch.calls[0].method).toBe("POST");
    expect(JSON.parse(fetch.calls[0].body ?? "")).toEqual({
      company_id: "com_9fJ2kQ7bTx0Lm4Ne1Ry8",
      kyc_legal_name: "Acme Trading BV",
      kyc_enterprise_number: "0123.456.789",
      attestation_name: "Jan Janssens",
      attestation_role: "Managing Director",
      attested: true,
      attestation_version: "2026-08-26",
    });
  });
});
