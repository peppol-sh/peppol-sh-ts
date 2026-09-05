import type { RequestFn } from "../client";
import type { paths } from "../generated/types";

/** Body of `POST /v1/documents`: a document plus the company sending it. */
export type DocumentSendParams =
  paths["/v1/documents"]["post"]["requestBody"]["content"]["application/json"];

/**
 * A sent document with computed totals and delivery status.
 *
 * `POST /v1/documents` answers `202` when it queues a new send and `200` when
 * an idempotent replay returns the record that already exists. Both carry the
 * same schema, so indexing on the union of the two keeps the alias honest.
 */
export type Document = paths["/v1/documents"]["post"]["responses"][
  | 200
  | 202]["content"]["application/json"];

/** Query for `GET /v1/documents/{id}`: the company the document belongs to. */
export type DocumentGetParams =
  paths["/v1/documents/{id}"]["get"]["parameters"]["query"];

/** A document's delivery timeline: created, validated, queued, sent, done. */
export type DocumentHistory =
  paths["/v1/documents/{id}/history"]["get"]["responses"][200]["content"]["application/json"];

/** The stored Send-ready UBL XML, as text. */
export type DocumentUbl =
  paths["/v1/documents/{id}/ubl"]["get"]["responses"][200]["content"]["application/xml"];

/** Metadata for every attachment stored with a document, in a `data` envelope. */
export type DocumentAttachmentList =
  paths["/v1/documents/{id}/attachments"]["get"]["responses"][200]["content"]["application/json"];

/**
 * One attachment's raw bytes. The API streams `application/octet-stream`, which
 * the transport hands back as text rather than parsed JSON.
 */
export type DocumentAttachmentBytes =
  paths["/v1/documents/{id}/attachments/{att_id}"]["get"]["responses"][200]["content"]["application/octet-stream"];

/** Body of `POST /v1/documents/batch`: up to 100 documents for one company. */
export type DocumentBatchSendParams =
  paths["/v1/documents/batch"]["post"]["requestBody"]["content"]["application/json"];

/**
 * Batch results, one entry per input document. Each entry is either the sent
 * document or the error envelope for that document alone.
 */
export type DocumentBatchResult =
  paths["/v1/documents/batch"]["post"]["responses"][202]["content"]["application/json"];

/** Query for `GET /v1/documents`: the company, filters, and the page cursor. */
export type DocumentListParams =
  paths["/v1/documents"]["get"]["parameters"]["query"];

/** A cursor-paginated page of documents. */
export type DocumentList =
  paths["/v1/documents"]["get"]["responses"][200]["content"]["application/json"];

/** `/v1/documents` endpoints — send, list, and fetch Peppol documents. */
export class Documents {
  readonly request: RequestFn;

  constructor(request: RequestFn) {
    this.request = request;
  }

  /**
   * `POST /v1/documents` — create and send one document. Answers `202` once
   * the document is queued, or `200` with the existing record when the call
   * is an idempotent replay; both hand back the same {@link Document}.
   */
  send(params: DocumentSendParams): Promise<Document> {
    return this.request<Document>({
      method: "POST",
      path: "/v1/documents",
      body: params,
    });
  }

  /**
   * `POST /v1/documents/batch` — send up to 100 documents for one company.
   * Documents are processed independently, so the result array mixes sent
   * documents with per-document error envelopes.
   */
  sendBatch(params: DocumentBatchSendParams): Promise<DocumentBatchResult> {
    return this.request<DocumentBatchResult>({
      method: "POST",
      path: "/v1/documents/batch",
      body: params,
    });
  }

  /** `GET /v1/documents` — one cursor-paginated page of a company's documents. */
  list(params: DocumentListParams): Promise<DocumentList> {
    return this.request<DocumentList>({
      method: "GET",
      path: "/v1/documents",
      query: params,
    });
  }

  /** `GET /v1/documents/{id}` — one document, scoped to its company. */
  get(id: string, params: DocumentGetParams): Promise<Document> {
    return this.request<Document>({
      method: "GET",
      path: `/v1/documents/${encodeURIComponent(id)}`,
      query: params,
    });
  }

  /**
   * `GET /v1/documents/{id}/history` — the document's delivery timeline,
   * scoped to the caller's workspace.
   */
  history(id: string): Promise<DocumentHistory> {
    return this.request<DocumentHistory>({
      method: "GET",
      path: `/v1/documents/${encodeURIComponent(id)}/history`,
    });
  }

  /**
   * `GET /v1/documents/{id}/ubl` — the Send-ready UBL XML. Answers `404` until
   * the document has been sent and its UBL persisted.
   */
  ubl(id: string): Promise<DocumentUbl> {
    return this.request<DocumentUbl>({
      method: "GET",
      path: `/v1/documents/${encodeURIComponent(id)}/ubl`,
    });
  }

  /**
   * `GET /v1/documents/{id}/attachments` — metadata only. The bytes come from
   * {@link Documents.getAttachment}.
   */
  listAttachments(id: string): Promise<DocumentAttachmentList> {
    return this.request<DocumentAttachmentList>({
      method: "GET",
      path: `/v1/documents/${encodeURIComponent(id)}/attachments`,
    });
  }

  /** `GET /v1/documents/{id}/attachments/{att_id}` — one attachment's bytes. */
  getAttachment(id: string, attId: string): Promise<DocumentAttachmentBytes> {
    return this.request<DocumentAttachmentBytes>({
      method: "GET",
      path: `/v1/documents/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attId)}`,
    });
  }
}
