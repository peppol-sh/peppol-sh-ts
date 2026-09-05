# @peppol-sh/sdk

Send e-invoices over the Peppol network with one API call. JSON in, e-invoice
out, delivered to the recipient's access point.

[![npm](https://img.shields.io/npm/v/@peppol-sh/sdk.svg)](https://www.npmjs.com/package/@peppol-sh/sdk)
[![CI](https://github.com/peppol-sh/peppol-sh-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/peppol-sh/peppol-sh-ts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

The client is a typed wrapper over the [peppol.sh](https://peppol.sh) `/v1`
API. Every request and response type is generated from the OpenAPI contract the
API itself is served from, and regenerated whenever that contract changes.

## Install

```bash
bun add @peppol-sh/sdk
# npm install @peppol-sh/sdk
# pnpm add @peppol-sh/sdk
# yarn add @peppol-sh/sdk
```

## Quickstart

Sign up at [peppol.sh](https://peppol.sh) — or with `POST /v1/signup` — and you
get a sandbox key (`ps_test_…`) straight away. Point the client at
`https://sandbox.peppol.sh`, create a company to send from, and send an invoice.

```ts
import { Peppol } from "@peppol-sh/sdk";

const peppol = new Peppol({
  apiKey: process.env.PEPPOL_API_KEY!, // ps_test_…
  baseUrl: "https://sandbox.peppol.sh", // omit for production
});

const company = await peppol.companies.create({
  name: "Acme BV",
  country: "BE",
  company_registration_id: "0123456749",
  peppol_id: "0208:0123456749", // 0208 = Belgian enterprise number
});
const companyId = company.id!;

const invoice = await peppol.documents.send({
  company_id: companyId,
  type: "invoice",
  number: "INV-2026-001",
  issue_date: "2026-03-01",
  due_date: "2026-03-31",
  currency: "EUR",
  from: {
    name: "Acme BV",
    tax_id: "BE0123456749",
    peppol_id: "0208:0123456749",
    address: {
      street: "Keizerslaan 1",
      city: "Brussels",
      postal_code: "1000",
      country: "BE",
    },
  },
  to: {
    name: "Globex NV",
    tax_id: "BE0987654394",
    peppol_id: "0208:0987654394",
  },
  lines: [
    {
      description: "API integration services",
      quantity: 1,
      unit: "C62", // UN/CEFACT unit code — C62 is "piece"
      unit_price: 500.0,
      tax_rate: 21.0,
    },
  ],
  payment_means: { method: "bank_transfer", iban: "BE68539007547034" },
  idempotency_key: "acme-INV-2026-001",
});

console.log(invoice.id, invoice.status, invoice.total);
// doc_a1b2c3d4 queued 605
```

Sending is asynchronous. Read the document back for its current status, or
subscribe to [webhooks](#webhooks) instead of polling.

```ts
const current = await peppol.documents.get(invoice.id!, {
  company_id: companyId,
});
console.log(current.status); // queued | sending | delivered | failed

const timeline = await peppol.documents.history(invoice.id!);
const ubl = await peppol.documents.ubl(invoice.id!); // Send-ready UBL XML
```

## Authentication and environments

Every request sends `Authorization: Bearer <apiKey>`. Keys are long-lived and
carry their environment in the prefix.

| Key prefix | Base URL | Delivery |
| --- | --- | --- |
| `ps_test_` | `https://sandbox.peppol.sh` | Sandbox — delivered by email, never touches the real Peppol network |
| `ps_live_` | `https://api.peppol.sh` (default) | Production — delivered over Peppol |

`baseUrl` defaults to `https://api.peppol.sh`, so a sandbox key needs the
sandbox URL set explicitly. A trailing slash is tolerated.

```ts
const client = new Peppol({
  apiKey: process.env.PEPPOL_API_KEY!,
  baseUrl: process.env.PEPPOL_BASE_URL, // undefined falls back to production
  timeoutMs: 15_000,
  maxRetries: 3,
});

console.log(await client.health());
// { status: "ok", version: "2.1.0", environment: "production", checks: { db: "ok" } }
```

### Client options

| Option | Default | What it does |
| --- | --- | --- |
| `apiKey` | *(required)* | Bearer key. The constructor throws `PeppolError` if it is empty. |
| `baseUrl` | `https://api.peppol.sh` | Sandbox, production, or a local API. |
| `fetch` | `globalThis.fetch` | Bring your own `fetch`: a proxy agent, an instrumented wrapper, a test stub. The constructor throws if no `fetch` exists and none is passed. |
| `timeoutMs` | `30000` | Per-attempt timeout. On expiry the call rejects with `PeppolTimeoutError`. |
| `maxRetries` | `2` | Extra attempts after a retryable failure. |
| `sleep` | `setTimeout` | Replaces the backoff timer. Useful in tests. |

The defaults are exported as `DEFAULT_BASE_URL`, `DEFAULT_TIMEOUT_MS`, and
`DEFAULT_MAX_RETRIES`; the package version the client reports in its
`x-peppol-sdk` request header is exported as `SDK_VERSION`.

## Error handling

Every non-2xx response becomes a typed error carrying the API's canonical
envelope — `{ error: { type, code, message, param?, details? } }`. Branch on
`code`, never on `message`.

```ts
import {
  PeppolApiError,
  PeppolConnectionError,
  PeppolRateLimitError,
  PeppolTimeoutError,
  PeppolValidationError,
} from "@peppol-sh/sdk";

try {
  await peppol.documents.get("doc_a1b2c3d4", { company_id: "com_abc123" });
} catch (error) {
  if (error instanceof PeppolValidationError) {
    console.error(`${error.code} on ${error.param}: ${error.message}`);
  } else if (error instanceof PeppolRateLimitError) {
    console.error(`Rate limited, retry in ${error.retryAfter ?? 1}s`);
  } else if (error instanceof PeppolApiError) {
    console.error(`HTTP ${error.status} ${error.code} (req ${error.requestId})`);
  } else if (error instanceof PeppolTimeoutError) {
    console.error(`Timed out after ${error.timeoutMs}ms`);
  } else if (error instanceof PeppolConnectionError) {
    console.error("Could not reach the API", error.cause);
  } else {
    throw error;
  }
}
```

| Class | Raised when |
| --- | --- |
| `PeppolValidationError` | HTTP 400 or 422 — the body or query failed validation. Read `param` for the field. |
| `PeppolAuthenticationError` | HTTP 401 — the key is missing, malformed, or unknown. |
| `PeppolPermissionError` | HTTP 403 — authenticated, but not allowed to do this. |
| `PeppolNotFoundError` | HTTP 404 — no such resource, or not visible to this key. |
| `PeppolConflictError` | HTTP 409 — the request conflicts with current state. |
| `PeppolRateLimitError` | HTTP 429 — too many requests. `retryAfter` holds the `Retry-After` seconds when the API sent one. |
| `PeppolServerError` | HTTP 5xx — a valid request the API failed to process. |
| `PeppolApiError` | Any other non-2xx status, for example 402 when the workspace is out of credits. Base class of all of the above. |
| `PeppolTimeoutError` | No answer within `timeoutMs`. Carries `timeoutMs`. |
| `PeppolConnectionError` | The request never arrived: DNS, TLS, or socket failure. The underlying failure is on `cause`. |
| `PeppolError` | Base class of everything the SDK throws, including client-side misconfiguration such as a missing `apiKey`. |

`PeppolApiError` and its subclasses expose `status`, `type`, `code`, `param`,
`details`, and `requestId` (from the `x-request-id` response header — quote it
in support requests).

## Pagination

List endpoints answer with `{ data, has_more, next_cursor }`. Pass
`next_cursor` back as `cursor` until it stops coming.

```ts
let cursor: string | undefined;

do {
  const page = await peppol.documents.list({
    company_id: "com_abc123",
    status: "delivered",
    limit: 50,
    cursor,
  });

  for (const doc of page.data ?? []) {
    console.log(doc.id, doc.status, doc.total);
  }

  cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
} while (cursor);
```

`documents.list`, `events.list`, `webhooks.listDeliveries`, and both
`listAuditEvents` methods page this way. `companies.list`, `webhooks.list`, and
`workspaces.list` return the full set in a `data` envelope.

## Retries and timeouts

Each attempt gets its own `timeoutMs` budget; on expiry the call rejects with
`PeppolTimeoutError` and is not retried. What is retried, up to `maxRetries`
extra attempts:

| Failure | Retried |
| --- | --- |
| HTTP 429 | Yes, for every method — the request was rejected before it was processed |
| HTTP 5xx | `GET` only |
| Network failure | `GET` only |
| HTTP 4xx other than 429 | Never |
| Timeout, or an aborted caller `signal` | Never |

Backoff is exponential with jitter, starting at 250 ms and capped at 2 s. A
`Retry-After` header wins over the computed delay (still capped at 2 s). Set
`maxRetries: 0` to handle failures yourself.

### Send is idempotent

Pass `idempotency_key` on `documents.send` and a repeated call is safe. The API
answers `202` when it queues a new send and `200` when it replays an existing
one; both carry the same document shape, so the SDK returns the same type
either way and you always get the record that exists. A retried send therefore
never produces a duplicate invoice on the network.

## API surface

Nine namespaces hang off the client, one per `/v1` area.

**`peppol.documents`**

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `send(params)` | `POST /v1/documents` | Create and send one document |
| `sendBatch(params)` | `POST /v1/documents/batch` | Send up to 100 documents for one company; results map 1:1 to the input |
| `list(params)` | `GET /v1/documents` | One cursor page of a company's documents |
| `get(id, params)` | `GET /v1/documents/{id}` | One document, scoped to its company |
| `history(id)` | `GET /v1/documents/{id}/history` | Delivery timeline: created, validated, queued, sending, delivered, failed |
| `ubl(id)` | `GET /v1/documents/{id}/ubl` | The stored Send-ready UBL XML, as text |
| `listAttachments(id)` | `GET /v1/documents/{id}/attachments` | Attachment metadata |
| `getAttachment(id, attId)` | `GET /v1/documents/{id}/attachments/{att_id}` | One attachment's raw bytes |

**`peppol.companies`**

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `create(params)` | `POST /v1/companies` | Create a company in the caller's workspace |
| `list()` | `GET /v1/companies` | Every company in the workspace, newest first |
| `get(id)` | `GET /v1/companies/{id}` | Full details for one company |
| `update(id, params)` | `PATCH /v1/companies/{id}` | Partial update; owners and admins only |

**`peppol.webhooks`**

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `list()` | `GET /v1/webhooks` | Every webhook in the workspace |
| `create(params)` | `POST /v1/webhooks` | Register an endpoint; returns the signing secret once |
| `get(id)` | `GET /v1/webhooks/{id}` | One webhook, without the secret |
| `delete(id)` | `DELETE /v1/webhooks/{id}` | Retire a webhook |
| `listDeliveries(id, params?)` | `GET /v1/webhooks/{id}/deliveries` | One page of the delivery log |
| `test(id)` | `POST /v1/webhooks/{id}/test` | Dispatch a synthetic `webhook.test` event |
| `rotateSecret(id)` | `POST /v1/webhooks/{id}/rotate-secret` | Mint a new secret, with a 24-hour overlap |

**`peppol.workspaces`**

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `create(params)` | `POST /v1/workspaces` | Create a workspace owned by the caller |
| `list()` | `GET /v1/workspaces` | Every workspace the account belongs to |
| `get(id)` | `GET /v1/workspaces/{id}` | One workspace, with the caller's role |
| `update(id, params)` | `PATCH /v1/workspaces/{id}` | Rename or reconfigure; owners and admins only |
| `delete(id)` | `DELETE /v1/workspaces/{id}` | Delete a workspace; owners only |
| `listMembers(id)` | `GET /v1/workspaces/{id}/members` | Every member and their role |
| `inviteMember(id, params)` | `POST /v1/workspaces/{id}/members` | Add a member; owners and admins only |
| `changeMemberRole(id, accountId, params)` | `PATCH /v1/workspaces/{id}/members/{accountId}` | Change a role; owners only |
| `removeMember(id, accountId)` | `DELETE /v1/workspaces/{id}/members/{accountId}` | Remove a member and revoke their keys for this workspace |
| `transferOwnership(id, params)` | `POST /v1/workspaces/{id}/transfer-ownership` | Promote another account to owner; the caller becomes admin |
| `listAuditEvents(id, params?)` | `GET /v1/workspaces/{id}/audit` | Audit events for this workspace |

**`peppol.account`, `peppol.kyc`, `peppol.events`, `peppol.lookup`,
`peppol.validate`, and the client itself**

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `account.get()` | `GET /v1/account` | Profile, key prefixes, usage totals |
| `account.createKey(params?)` | `POST /v1/account/keys` | Mint an extra key; the full key is returned once |
| `account.revokeKey(prefix)` | `DELETE /v1/account/keys/{prefix}` | Revoke a key permanently |
| `account.listAuditEvents(params?)` | `GET /v1/account/audit` | Audit events across every workspace joined |
| `account.getUsage(params?)` | `GET /v1/account/usage` | Daily documents and API calls |
| `kyc.get()` | `GET /v1/kyc` | Status, attestation, documents, and what is still missing |
| `kyc.uploadDocument(params)` | `POST /v1/kyc/documents` | Upload one document as base64 (10 MB decoded max) |
| `kyc.submit(params)` | `POST /v1/kyc/submit` | Submit the workspace for review |
| `events.list(params?)` | `GET /v1/events` | The workspace event feed behind webhook deliveries, newest first |
| `lookup.participant(peppolId, options?)` | `GET /v1/lookup/{peppol_id}` | Resolve a participant through its SMP: document types and AS4 endpoints |
| `lookup.dns(peppolId, options?)` | `GET /v1/lookup/{peppol_id}/dns` | The NAPTR/SMP DNS layer only |
| `validate.document(params)` | `POST /v1/validate` | Check a payload without creating or sending anything |
| `health()` | `GET /v1/health` | Liveness probe with per-dependency checks |
| `signup(params)` | `POST /v1/signup` | Create an account and get a sandbox key. Unauthenticated: no `Authorization` header is sent |

Every namespace also exposes `.request()`, the same transport the typed methods
use, so an endpoint the SDK does not wrap yet is still one call away with the
auth, retry, timeout, and error handling described above.

## TypeScript

Types are generated from `openapi.yaml` with
[openapi-typescript](https://github.com/openapi-ts/openapi-typescript) and
re-exported from the package root — parameter and payload aliases per
namespace, plus the whole generated tree under `ApiTypes` as an escape hatch.

```ts
import type {
  ApiTypes,
  Document,
  DocumentSendParams,
  ValidationResult,
} from "@peppol-sh/sdk";

type DocumentStatus = ApiTypes.components["schemas"]["DocumentStatus"];

function describe(doc: Document): string {
  return `${doc.number} → ${doc.to?.name} (${doc.status})`;
}

function firstProblem(result: ValidationResult): string | undefined {
  return result.errors?.[0]?.message;
}

const draft: DocumentSendParams = {
  company_id: "com_abc123",
  type: "invoice",
  number: "INV-2026-002",
  issue_date: "2026-03-02",
  currency: "EUR",
  from: { name: "Acme BV", tax_id: "BE0123456749" },
  to: { name: "Globex NV", tax_id: "BE0987654394" },
  lines: [
    {
      description: "Support",
      quantity: 2,
      unit: "C62",
      unit_price: 75,
      tax_rate: 21,
    },
  ],
};
```

Two quirks of generation: response fields are mostly optional, because the
contract marks few of them required — narrow or assert them. Request fields
with a schema default (`type`, `currency`, `unit`, `payment_means.method`) are
required, even though the API fills them in — pass them explicitly.

## Webhooks

Register an endpoint and the API posts document events to it — no polling.

```ts
const hook = await peppol.webhooks.create({
  url: "https://example.com/hooks/peppol",
  events: ["document.delivered", "document.failed", "credits.low"],
});

console.log(hook.secret); // whsec_… — shown once, store it now
```

Each delivery carries `X-Peppol-Signature-V2` (an HMAC-SHA256 signature over
the timestamp and the raw body), `X-Peppol-Timestamp`, `X-Peppol-Event`, and
`X-Peppol-Delivery-Id`. Verify the signature against the raw received bytes
before parsing the JSON — re-serializing a parsed object breaks the HMAC — and
deduplicate on `X-Peppol-Delivery-Id`, which is stable across retries. The
algorithm, the rotation overlap, and the retry schedule are documented at
<https://peppol.sh/docs>. `webhooks.test(id)` sends a synthetic event to check
your receiver; `webhooks.listDeliveries(id)` shows every attempt.

## Requirements

Any runtime with a global `fetch`: Node 18+, Bun, Deno, Cloudflare Workers, and
browsers. ESM only. Zero runtime dependencies. On an older runtime, or behind a
proxy, pass your own implementation with the `fetch` option.

## Documentation

- Guides and API reference — <https://peppol.sh/docs>
- OpenAPI spec — <https://api.peppol.sh/v1/openapi.json>
- Changelog — [CHANGELOG.md](./CHANGELOG.md)

## Contributing

This repository is a read-only mirror. The SDK is developed in a private
monorepo next to the API and its OpenAPI contract, so an API change and its
client update land in one commit and are tested together. Pull requests are
still welcome here: maintainers apply accepted changes upstream, and they flow
back with the next mirror push — your change ships, but not under the commit
hash you pushed, and mirror pushes rewrite history, so do not build long-lived
branches here. Issues and feature requests belong on this repository.

## License

MIT © e-invoice bv
