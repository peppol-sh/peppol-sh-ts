import type { RequestFn } from "../client";
import type { paths } from "../generated/types";

/** The whole KYC state of the caller's workspace. */
export type KycState =
  paths["/v1/kyc"]["get"]["responses"][200]["content"]["application/json"];

/** Body of `POST /v1/kyc/documents` — the file is base64 in `content`. */
export type KycDocumentUploadParams =
  paths["/v1/kyc/documents"]["post"]["requestBody"]["content"]["application/json"];

/** A stored KYC document. `sha256` and `r2_key` are never returned. */
export type KycDocument =
  paths["/v1/kyc/documents"]["post"]["responses"][201]["content"]["application/json"];

/** Body of `POST /v1/kyc/submit`. */
export type KycSubmitParams =
  paths["/v1/kyc/submit"]["post"]["requestBody"]["content"]["application/json"];

/** `/v1/kyc` endpoints — workspace KYC documents and submission. */
export class Kyc {
  readonly request: RequestFn;

  constructor(request: RequestFn) {
    this.request = request;
  }

  /**
   * `GET /v1/kyc` — status, attestation, documents, and the `requirements`
   * block that says what is still missing before a submit can pass.
   */
  get(): Promise<KycState> {
    return this.request<KycState>({ method: "GET", path: "/v1/kyc" });
  }

  /**
   * `POST /v1/kyc/documents` — uploads one document as base64 bytes (max
   * 10 MB decoded). Workspace types omit `company_id` and
   * `mandate_grantor_name`; a `mandate` requires both.
   */
  uploadDocument(params: KycDocumentUploadParams): Promise<KycDocument> {
    return this.request<KycDocument>({
      method: "POST",
      path: "/v1/kyc/documents",
      body: params,
    });
  }

  /**
   * `POST /v1/kyc/submit` — submits the workspace for review. Returns the
   * full KYC state with `status` flipped to `pending`.
   */
  submit(params: KycSubmitParams): Promise<KycState> {
    return this.request<KycState>({
      method: "POST",
      path: "/v1/kyc/submit",
      body: params,
    });
  }
}
