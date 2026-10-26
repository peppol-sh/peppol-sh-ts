# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The docs of `CompanyCreate` and `CompanyUpdate` describe the format of a
  VAT-scheme `peppol_id` (`99xx`): the VAT number with its country prefix and
  check digit, `9933` without `EL`. A new error code,
  `peppol_id_tax_id_mismatch`: a VAT-scheme Peppol ID that is not the VAT
  number in `tax_id`. A register number in a VAT scheme gets a message that
  says so (#454).
- The docs of `CompanyCreate` and `CompanyUpdate` describe the characters of a
  `peppol_id`: 1 to 130 letters, digits, `-`, `.`, `_` or `~` after the colon,
  no whitespace, and 10 digits for `0208`. The API rejects
  `0208:0410.086.603` with `invalid_peppol_id` and names the clean value (`Use
  0208:0410086603.`); a Belgian default Peppol ID drops the dots and spaces of
  the registration number (#375).

## [0.6.0] - 2026-10-20

### Added

- `DocumentSendParams` has an optional `purchase_order` (BT-13,
  `cac:OrderReference/cbc:ID`) and `sales_order` (BT-14,
  `cac:OrderReference/cbc:SalesOrderID`). With a `sales_order` and no
  `purchase_order`, the order reference ID is `NA` (#435).
- `Party` has an optional `contact_name` (BT-41 for `from`, BT-56 for `to`)
  and `identifier` (the buyer identifier, BT-46, only on `to`). A
  `contact_name` needs an `email` on the same party, else the API answers
  `400 invalid_document_body` with `param` `to.contact_name` (or
  `from.contact_name`). A `from.identifier` gives `400 invalid_document_body`
  with `param` `from.identifier` (#435).
- `Document` (from `documents.get` and `documents.list`) has
  `buyer_reference`, `purchase_order` and `sales_order`, and its `from` and
  `to` have `email`, `contact_name` and (only `to`) `identifier`, when the
  document was created with them (#435).

### Changed

- The `event_type` of `AuditEvent` in the generated types has
  `membership.invite_resent`: the dashboard writes it when an owner or an
  admin sends a pending invite again. `workspaces.listAuditEvents` and
  `account.listAuditEvents` can return it.
- The generated types of `POST /v1/workspaces/{id}/members`
  (`workspaces.inviteMember`) document that it adds only an existing account
  (an `email` with no account gives `404 account_not_found`) and that the
  added account now gets an email from peppol.sh.
- `DocumentEvent`, the item type of `documents.history`, has the fields the
  API sends: `id`, `type`, `from_status`, `to_status`, `message` and
  `created_at`. The old `event`, `timestamp` and `detail` fields were never
  sent (#418).
- `created_at`, `sent_at` and `delivered_at` of a document, `created_at` of a
  history event, and `created_at` and `updated_at` of a company are RFC 3339
  date-times (`2026-10-20T08:25:00Z`), as the types said. The API sent
  `2026-10-20 08:25:00` before (#418).
- `created_at` of a webhook, a workspace, a workspace member, an account,
  an API key, a KYC document, a document attachment, an event and an audit
  event, and `updated_at` of a workspace and `last_used_at` of an API key,
  are RFC 3339 date-times too. The API sent `2026-10-20 08:25:00` before
  (#418).
- `documents.get` gives the `sandbox` flag and the `events` of the document,
  which the API always sent. `from_status` of an event is a document status
  (#418).
- `health` gives `worker_version` (`id`, `created_at`), the Worker version
  that served the request, or `null` (#418).
- The generated types of `webhooks.create` have the `400` response, and those
  of `documents.history` the `404` response (#418).
- `website_urls` of a Business Card entity is a plain string: a participant
  can enter `www.peppol.org` (#418).
- The API now answers `400 invalid_body` (and not `500`) on `companies.create`
  and `companies.update` when the body is not valid JSON or not a JSON object
  (#418).
- `buyer_reference` now goes only to `cbc:BuyerReference` (BT-10). The API no
  longer copies it to `cac:OrderReference/cbc:ID` (BT-13): put the purchase
  order number in `purchase_order`. Without `buyer_reference`, a document
  gets `purchase_order`, else `to.identifier`, else `Unknown` as
  BT-10 (#435).

### Fixed

- The `email` of a party (BT-43 for `from`, BT-58 for `to`) is now sent to the
  Peppol network and is in the UBL. Before, the API accepted it and left it
  out (#435).

## [0.5.0] - 2026-10-20

### Changed

- `tax_id` on `Party` (the `from` and `to` of `DocumentSendParams`) is
  optional, as in the API: a party needs a `tax_id` only when it has no
  `peppol_id`. A party with only a `peppol_id` (for example a Norwegian
  company with no VAT number) now compiles with no cast (#425).
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

### Fixed

- A sandbox send no longer fails for a party with a `peppol_id`, no `tax_id`
  and no `address.country`. The UBL of a party with no `tax_id` has no
  `PartyTaxScheme` (#425).

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
[0.6.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.6.0
[0.5.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.5.0
[0.4.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.4.0
[0.3.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.3.0
[0.2.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.2.0
