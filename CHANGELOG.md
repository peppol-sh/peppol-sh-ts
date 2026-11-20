# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- A `payment_means` without an account number (no `iban`, no `accounts`)
  now gets the IBAN of the company in `payment_means.iban`, when `from` is the
  company and, with spaces and dashes removed, its `iban` is a valid IBAN.
  A `bic`, `method` and `reference`
  you send are kept. The filled value is stored, so `documents.get` and
  `documents.ubl` show it (#595).
- A `payment_means` that still has no account number is now refused before
  the credit is charged, for every `method` and for `ps_test_` and
  `ps_live_` keys: `documents.send` throws `PeppolValidationError` (status
  `422`, code `payment_account_required`, `param` `payment_means`). Peppol
  requires the account number (BR-61, Payment account identifier BT-84). No
  credit is charged and no document is made. Before, the document was
  accepted, failed at the Peppol network and the credit came back later.
  `documents.sendBatch` gives the error for that item and sends the other
  items. `validate.document` gives `valid: false` with one entry in `errors`
  (`path` `payment_means`, `code` `payment_account_required`). A document
  without `payment_means` is not checked (#595).
- A German domestic document (seller and buyer both in Germany) is now
  checked before the credit is charged, for `ps_test_` and `ps_live_` keys.
  The country of a party is `address.country`, else the prefix of the VAT
  number in `tax_id`, else the country of the `peppol_id` scheme. Peppol
  requires `from.contact_name` (DE-R-005), `from.email` (DE-R-007),
  `from.phone` (DE-R-006), `payment_means` (DE-R-001) and `buyer_reference`
  (DE-R-015) on it. The `invoice_contact` of the company is filled in first,
  so it satisfies the three `from` fields. When a field is missing,
  `documents.send` throws `PeppolValidationError` (status `422`, code
  `de_domestic_fields_missing`, `param` the first missing field). `details`
  is `{ missing: [{ field, rule }] }`, for example
  `{ field: 'from.phone', rule: 'DE-R-006' }`. No credit is charged and no
  document is made. Before, the document was accepted, failed at the Peppol
  network and the credit came back about a minute later (#574).
- Any other document to a `0204` receiver (a German public body) now needs
  `buyer_reference`, which holds the Leitweg-ID. Without it `documents.send`
  throws `PeppolValidationError` (status `422`, code
  `buyer_reference_required`, `param` `buyer_reference`) (#574).
- For both codes, `documents.sendBatch` gives the error for that item in its
  result and sends the other items. `validate.document` gives `valid: false`:
  one entry in `errors` for each missing field (`code`
  `de_domestic_fields_missing`, `path` the field), or one entry with `path`
  `buyer_reference` and `code` `buyer_reference_required` (#574).

### Fixed

- `events.list` can follow `next_cursor`. A `cursor` that is not unpadded
  base64url, or whose decoded text has no newline, throws
  `PeppolValidationError` (status `400`, code `invalid_cursor`, `param`
  `cursor`). An empty `cursor` does too. Before, the next page and any
  request with a `cursor` failed with `500` `internal_error` (#590).

## [0.9.0] - 2026-11-18

### Added

- A company has an Invoice contact: `invoice_contact` with `name`, `email`
  and `phone`, on `companies.create` and `companies.update`. When a document
  is accepted (`documents.send`, `documents.sendBatch`), each of
  `from.contact_name`, `from.email` and `from.phone` that the document leaves
  out gets the value of the company. A value of the document wins, per field.
  The name is filled in only when the party then has an email. A document that
  already has a contact name and leaves the email out is accepted when the
  company supplies the email, and rejected with `invalid_document_body` on
  `from.contact_name` when it does not.
  `validate.document` uses the same defaults. Peppol requires the three fields
  when seller and buyer are both in Germany (rules DE-R-005, DE-R-006,
  DE-R-007): set them one time on the company. All three are optional. `name`
  is trimmed and must then have 1 to 200 characters, `email` must be a valid
  email address, `phone` is trimmed and must then have 1 to 100 characters
  (the format is not checked). A refused value throws `PeppolValidationError`
  (status `400`, code `invalid_field`, `param` for example
  `invoice_contact.phone`). On `companies.update`, a field that is absent
  stays as it is, `null` for a field clears it, and `invoice_contact: null`
  clears the three fields. The company `email` is a different field and is
  never put on a document (#573).
- `Company`, `CompanyListItem` and `CompanyDetail` (from `companies.create`,
  `companies.list`, `companies.get` and `companies.update`) always have
  `invoice_contact`. A field that is not set is `null` (#573).
- `Document` (from `documents.get`) shows the filled values on `from`. A later
  change of the company does not change a document that is already accepted
  (#573).

## [0.8.0] - 2026-11-18

### Added

- `Party` (`from` and `to` of `documents.send`, `documents.sendBatch` and
  `validate.document`) has an optional `phone`: the contact phone (BT-42 for
  `from`, BT-57 for `to`). It needs no `email`. It is trimmed and must then
  have 1 to 100 characters; the format is not checked. Peppol requires
  `from.phone` when seller and buyer are both in Germany (rule DE-R-006),
  together with `contact_name` and `email`. Before this release the API
  accepted the field but did not send it to the receiver (#571).
- `Document` (from `documents.get`) has `phone` on its `from` and `to`, when
  the document was created with it (#571).

### Changed

- A `phone` on `from` or `to` now has a rule. Before, the API took any value
  and did not use it. Now the value must be a string of 1 to 100 characters
  after trimming: `documents.send` throws `PeppolValidationError`
  (status `400`, code `invalid_document_body`, `param` `from.phone` or
  `to.phone`) for a blank string or a value of another type.
- The API now answers `400 invalid_body` (and not `500`) when the body is
  not valid JSON or not a JSON object, on every route that reads a JSON
  body. This includes `POST /v1/signup`, `webhooks.create`,
  `account.createKey` and the workspace calls. The SDK always sends valid
  JSON, so this is seen only by a caller that builds the request itself
  (#568).
- A document now goes out with a postal country for the sender and the
  receiver when one can be derived. The country is `address.country`; when
  that is left out or is no two-letter code, the prefix of the VAT number in `tax_id` (the Greek `EL` gives `GR`); else the
  country of the `peppol_id` scheme (for example `0192` gives `NO`). A
  scheme that is not of one country (`0088`, `0060`) gives none. Before, a
  live document with no `address.country` went out with the country `BE`.
  When no country follows for a party, `documents.send` throws
  `PeppolValidationError` (status `422`, code `party_country_required`,
  `param` `from.address.country` or `to.address.country`) for a `ps_test_`
  key. No credit is charged and no document is made.
  `documents.sendBatch` gives the error for that item in its result.
  `validate.document` gives `valid: false` with an entry in `errors`
  (`code` `party_country_required`, `path` the field). A `ps_live_` key
  does not get the error yet: for a warning period the document is accepted
  and goes out with the country `BE`, and `validate.document` gives the
  entry in `warnings`. After that period a `ps_live_` key gets the same
  `422`. Give `address.country` for both parties to be safe (#576).
- `currency` of a document must now be one of `EUR`, `USD`, `GBP`, `JPY`,
  `CHF`, `CAD`, `AUD`, `NZD`, `CNY`, `INR`, `SEK`, `NOK`, `DKK`, `SGD`, `HKD`.
  Before, the API took any string. `documents.send` throws
  `PeppolValidationError` (status `422`) for another value: code
  `unsupported_currency` for an ISO 4217 code that cannot be sent (for example
  `PLN`), code `invalid_field` for a value that is no currency code. `param`
  is `currency`. `documents.sendBatch` throws the same error for the whole
  batch, with the index of the document in `param` (`1.currency`). No credit
  is charged and no document is made. `validate.document` gives `valid: false`
  with an entry in `errors` (`path` `currency`). The API ignores letter case
  and spaces around the code, and stores and sends the code in upper case.
  Left out, the currency is `EUR` as before. The type of `currency` in
  `DocumentCreate` narrows from `string` to the union of these codes, so a
  `string` variable needs a check or a cast. `Document.currency` in a response
  stays `string`.
- A document whose sender is not the company is now refused at once.
  `documents.send` throws `PeppolValidationError` (status `422`, code
  `sender_not_registered`, `param` `from.peppol_id` or `from.tax_id`) for a
  `ps_test_` and a `ps_live_` key. Before, the API answered `202` and the
  document became `failed`. No credit is charged and no document is made.
  `documents.sendBatch` gives the error for that item in its result.
  `validate.document` gives `valid: false` with an entry in `errors`
  (`code` `sender_not_registered`, `path` the field). The rule: a
  `from.peppol_id` must be the Peppol ID of the company; a VAT number or a
  `scheme:id` in `from.tax_id` must give that Peppol ID or be the company's
  own `tax_id`. A `from` with neither sends as the company. A document can
  still become `failed` with this message when the Peppol ID of the company
  changes between the `202` and the send.
- A sandbox send (`documents.send` and `documents.sendBatch` with a
  `ps_test_` key) now runs the checks of a live send, in the same order. The
  API answers `202` as before; then the document becomes `failed` when:
  1. a field does not have the form that the Peppol network takes: "The
     document failed Peppol BIS 3.0 validation: …";
  2. no Peppol ID follows for the sender or the receiver: "The Peppol ID of
     the sender or the receiver could not be found. …";
  3. the totals or the Peppol BIS 3.0 rules fail, as in `validate.document`:
     "The document failed Peppol BIS 3.0 validation: …". A document with an
     amount due and no `due_date` fails rule BR-CO-25;
  4. the receiver is not registered on the Peppol network: "The document could
     not be delivered over the Peppol network."

  The reason is the `message` of the `failed` event in `documents.get` and
  `documents.history`. Send from your company, set a `due_date`, and send to
  the sandbox test receiver `0208:1234567894` (VAT number `BE1234567894`).
  The checks call the Peppol network, so a sandbox send can also end in
  `provider_unavailable`, `rate_limited` or `provider_error`.
- `documents.ubl` of a sandbox document gives the UBL rendered by the
  validator of `validate.document` (a local render when that validator is
  unavailable).
- `lookup.participant` and `lookup.dns` throw `PeppolServerError` (status
  `502`, code `smp_error`) when the DNS resolver fails, instead of
  `PeppolNotFoundError`.
- The generated types describe the sandbox checks, the sandbox test receiver
  (`documents.send`, `validate.document`, `DocumentStatus`) and the `502` of
  `lookup.participant` and `lookup.dns`.
- The README quickstart sends to the sandbox test receiver, with a
  `due_date`.

## [0.7.0] - 2026-10-30

### Added

- `payment_means` on `documents.send`, `documents.sendBatch` and
  `validate.document` has an optional `accounts`: one to ten accounts of type
  `iban`, `bankgiro`, `plusgiro` or `other`, with the same reference. `method`
  must be `bank_transfer`. On a send, `iban` and `bic` give a 400 together
  with `accounts`; `validate.document` returns that as `valid: false` (#414).
- `DocumentSendParams` and `ValidateDocumentParams` have an optional
  `rounding_amount` (BT-114, `cbc:PayableRoundingAmount`): the signed amount
  that rounds the amount due, below `1.00` either way. `total` does not
  include it. New error codes on a send:
  `rounding_amount_out_of_range` and `amount_due_excludes_rounding` (#415).

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
[0.9.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.9.0
[0.8.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.8.0
[0.7.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.7.0
[0.6.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.6.0
[0.5.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.5.0
[0.4.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.4.0
[0.3.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.3.0
[0.2.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.2.0
