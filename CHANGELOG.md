# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `ErrorObject` has an optional `request_id` (the `cf-ray` of the request) on
  an `internal_error`. Give it to us when you report the error (#421).
- The API now answers `400 invalid_document_body` (and not `500`) on
  `documents.send` and `documents.sendBatch` when `number`, `from`, `to`,
  `from.name`, `to.name`, or the `tax_id` of a party with no `peppol_id` is
  missing, empty, or only whitespace; `param` names the field. A body that is
  not valid JSON gives `400 invalid_body` (#421).
- For `documents.sendBatch`, `param` starts with the index of the item, for
  example `1.to.tax_id` (#421).
- `validate.document` answers `valid: false` (and not `500`) for a body with
  no `from` or `to`, with the same checks as a send (#421).
- The generated types of `POST /v1/validate` have the `400` response (a body
  that cannot be read, or a `file` part of a type that is not accepted) and
  the `413` response (`file_too_large`, a `file` part above 5 MB) (#413).
- The doc comment of `code` on `ValidationIssue` names the issue codes: the
  Peppol rule id (e.g. `BR-S-02`), `invalid_document_body` for a request body
  issue, or `invalid_document` when the provider rejects the document without
  a rule id (#413).

## [0.4.0] - 2026-10-16

### Added

- `companies.delete(id)`: `DELETE /v1/companies/{id}` deletes a company, its
  documents, and its Peppol registration, and resolves to `undefined` (the API
  answers `204`). Only workspace owners can delete a company, and the delete
  cannot be undone. A `ps_test_` key can delete only a company that is not
  live; for a live company the API returns `live_company_requires_live_key`
  (#405).

### Changed

- The doc comment of `tax_id` on `Party` says that a `tax_id` with no
  country prefix is not sent as a VAT number, so the party then needs a
  `peppol_id` (#395).
- The doc comments of `peppol_id` on `CompanyCreate` and `CompanyUpdate`
  describe the new API checks (#391): the scheme must be active, the
  identifier must have the format and check digit of its scheme, and the
  scheme must belong to the company country or be international. The API
  returns `peppol_id_country_mismatch` for a scheme of another country.

## [0.3.0] - 2026-10-08

### Added

- `preceding_invoice` on `DocumentSendParams` and on `Document`: the preceding
  invoice reference. This is the earlier invoice that a document corrects, for
  example the invoice that a credit note credits. `number` is mandatory
  (BT-25). `issue_date` is optional (BT-26). The type is
  `ApiTypes.components["schemas"]["PrecedingInvoice"]`.
- `amount_due` on `DocumentSendParams` and on `Document`: the amount due for
  payment (BT-115), for a document that is paid before it is sent. Use `0` for
  a fully prepaid document. The value must be from `0` up to the document total
  with VAT. The prepaid amount (BT-113) is the total less `amount_due`. `Document`
  has the field only when the document was created with one.

### Fixed

- `total`, `subtotal`, and `tax_total` on `Document`: the API includes the
  line-level and the document-level allowances and charges in the total with
  VAT (BT-112), the total without VAT (BT-109), and the VAT total (BT-110).
  This is an API change: only the generated type comments changed.

## [0.2.0] - 2026-10-07

### Changed

- `documents.send` returns the new `DocumentAccepted` type (`id`, `status`,
  `url`), and `sendBatch` returns it for each accepted item. This is what the
  API always returned; the types said `Document`. `Document` is now the
  response of `documents.get`. Code that read fields such as `total` or
  `number` from the result of `send` must call `documents.get` for them.
- Package description on npm: removed "send and receive".
- Releases are published from GitHub Actions with npm trusted publishing.

## [0.1.0] - 2026-09-11

### Added

- Initial `Peppol` client: API key auth, configurable base URL, injectable
  `fetch`, request timeout, and retries with exponential backoff.
- `health()` — `GET /v1/health`.
- Typed error hierarchy: `PeppolError`, `PeppolApiError`, and one subclass per
  HTTP status (`PeppolValidationError`, `PeppolAuthenticationError`,
  `PeppolPermissionError`, `PeppolNotFoundError`, `PeppolConflictError`,
  `PeppolRateLimitError`, `PeppolServerError`), plus `PeppolConnectionError`
  and `PeppolTimeoutError`.
- `ApiTypes` — request and response types generated from the OpenAPI spec,
  plus every namespace's parameter and payload types re-exported from the
  package root.
- `documents` — `send`, `sendBatch`, `list`, `get`, `history`, `ubl`,
  `listAttachments`, `getAttachment`.
- `companies` — `create`, `list`, `get`, `update`.
- `webhooks` — `list`, `create`, `get`, `delete`, `listDeliveries`, `test`,
  `rotateSecret`.
- `events` — `list`.
- `lookup` — `participant`, `dns`.
- `validate` — `document`.
- `account` — `get`, `createKey`, `revokeKey`, `listAuditEvents`, `getUsage`.
- `workspaces` — `create`, `list`, `get`, `update`, `delete`, `listMembers`,
  `inviteMember`, `changeMemberRole`, `removeMember`, `transferOwnership`,
  `listAuditEvents`.
- `kyc` — `get`, `uploadDocument`, `submit`.

[Unreleased]: https://github.com/peppol-sh/peppol-sh-ts/commits/main
[0.4.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.4.0
[0.3.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.3.0
[0.2.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.2.0
