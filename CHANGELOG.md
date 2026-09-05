# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
