# AGENTS.md

Guidance for AI coding agents that use or change `@peppol-sh/sdk`, the
TypeScript client for the [peppol.sh](https://peppol.sh) Peppol e-invoicing
API. `README.md` has the full reference; this file has the rules that prevent
the common mistakes.

## Use the SDK

```bash
npm install @peppol-sh/sdk   # or bun add / pnpm add / yarn add
```

```ts
import { Peppol } from "@peppol-sh/sdk";

const peppol = new Peppol({
  apiKey: process.env.PEPPOL_API_KEY!,
  baseUrl: "https://sandbox.peppol.sh", // omit for production
});
```

- **Auth is an API key**, sent as `Authorization: Bearer <key>`. There is no
  OAuth. `new Peppol({ apiKey: "unused" }).signup({ email })` calls
  `POST /v1/signup` without the key and returns a sandbox key once.
- **The key prefix selects the environment, the client does not.** A
  `ps_test_` key needs `baseUrl: "https://sandbox.peppol.sh"` (delivery by
  email, no real Peppol network). A `ps_live_` key uses the default
  `https://api.peppol.sh`. Never send test data with a live key.
- **Read the key from the environment.** Do not write it into source files.
- **Pass `idempotency_key` on `documents.send`** (for example the invoice
  number), so a retry does not send the invoice twice.
- **Do not invent methods.** The complete surface is below. Method parameters
  and results are typed from the OpenAPI contract; let the compiler check them.

| Namespace | Methods |
|---|---|
| `peppol` | `signup`, `health` |
| `peppol.companies` | `create`, `list`, `get`, `update` |
| `peppol.documents` | `send`, `sendBatch`, `list`, `get`, `history`, `ubl`, `listAttachments`, `getAttachment` |
| `peppol.validate` | `document` |
| `peppol.lookup` | `participant`, `dns` |
| `peppol.webhooks` | `list`, `create`, `get`, `delete`, `listDeliveries`, `test`, `rotateSecret` |
| `peppol.events` | `list` |
| `peppol.kyc` | `get`, `uploadDocument`, `submit` |
| `peppol.account` | `get`, `createKey`, `revokeKey`, `listAuditEvents`, `getUsage` |
| `peppol.workspaces` | `create`, `list`, `get`, `update`, `delete`, `listMembers`, `inviteMember`, `changeMemberRole`, `removeMember`, `transferOwnership`, `listAuditEvents` |

Each failure is a `PeppolError` subclass (`PeppolValidationError`,
`PeppolAuthenticationError`, `PeppolRateLimitError`, …). Use `instanceof`, not
the message text. The client retries retryable failures itself (`maxRetries`,
default 2), so do not add a second retry loop around it.

The SDK has no webhook signature helper. `README.md` (section Webhooks) names
the `X-Peppol-Signature-V2` header and what to verify.

## Change the SDK

This repository is a read-only mirror: each push overwrites it from the
`packages/sdk-typescript` folder of the private peppol.sh monorepo. Open an
issue or a pull request here; a maintainer applies it upstream.

```bash
bun install
bun run test        # vitest
bun run typecheck   # tsc --noEmit
bun run lint        # biome check --config-path=biome.jsonc .
bun run build       # tsc -> dist/
```

- `src/generated/types.ts` is generated from the API's OpenAPI spec
  (`bun run generate:types`, monorepo only). Do not edit it by hand.
- One file for each API area in `src/resources/`. A resource class gets a
  `RequestFn` in its constructor and never calls `fetch`. Take its types from
  `src/generated/types.ts`, not from hand-written interfaces.
- Tests are in `src/__tests__/` and use a stubbed `fetch` (`fetchStub` in
  `helpers.ts`). No test calls the network. Add a test with each new method.
- The package has zero runtime dependencies. Keep it so.
- Add each user-visible change to `CHANGELOG.md`.
