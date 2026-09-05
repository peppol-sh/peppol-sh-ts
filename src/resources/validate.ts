import type { RequestFn } from "../client";
import type { paths } from "../generated/types";

type ValidatePath = paths["/v1/validate"];

/**
 * A `DocumentCreate` body plus the `company_id` whose provider credentials
 * validate it. This is the `application/json` variant; the spec also accepts
 * `multipart/form-data` with a UBL XML file, which this method does not send.
 */
export type ValidateDocumentParams =
  ValidatePath["post"]["requestBody"]["content"]["application/json"];

/** The outcome of a validation: `valid`, plus field-level errors and warnings. */
export type ValidationResult =
  ValidatePath["post"]["responses"][200]["content"]["application/json"];

/** One field-level issue, with a dot-path pointing at the offending field. */
export type ValidationIssue = NonNullable<ValidationResult["errors"]>[number];

/** `/v1/validate` endpoints — check a payload before sending it. */
export class Validate {
  readonly request: RequestFn;

  constructor(request: RequestFn) {
    this.request = request;
  }

  /**
   * `POST /v1/validate` — validate a document payload without creating or
   * sending anything.
   */
  document(params: ValidateDocumentParams): Promise<ValidationResult> {
    return this.request<ValidationResult>({
      method: "POST",
      path: "/v1/validate",
      body: params,
    });
  }
}
