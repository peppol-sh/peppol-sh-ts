# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
[0.2.0]: https://github.com/peppol-sh/peppol-sh-ts/releases/tag/v0.2.0
