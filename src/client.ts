import {
  errorFromResponse,
  PeppolConnectionError,
  PeppolError,
  PeppolTimeoutError,
  parseRetryAfter,
} from "./errors";
import type { components, paths } from "./generated/types";
import { Account } from "./resources/account";
import { Companies } from "./resources/companies";
import { Documents } from "./resources/documents";
import { Events } from "./resources/events";
import { Kyc } from "./resources/kyc";
import { Lookup } from "./resources/lookup";
import { Validate } from "./resources/validate";
import { Webhooks } from "./resources/webhooks";
import { Workspaces } from "./resources/workspaces";

/** The `fetch` implementation the client uses. Injectable for tests and runtimes. */
export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method: HttpMethod;
  /** Path relative to the base URL, e.g. `/v1/documents`. */
  path: string;
  /** Query string values; `undefined` and `null` entries are skipped. */
  query?: Record<string, QueryValue>;
  /** JSON request body. Omit for bodyless requests. */
  body?: unknown;
  /** Extra headers merged over the defaults. */
  headers?: Record<string, string>;
  /** Caller-supplied cancellation signal, combined with the client timeout. */
  signal?: AbortSignal;
  /**
   * Sends the `Authorization` header. Defaults to `true`; the only endpoints
   * that set it to `false` are the ones the spec marks `security: []`.
   */
  auth?: boolean;
}

/**
 * The single seam every resource namespace talks to. Resource classes receive
 * one of these in their constructor and never touch `fetch` themselves.
 */
export type RequestFn = <T>(options: RequestOptions) => Promise<T>;

export interface PeppolOptions {
  /** API key: `ps_test_…` for sandbox, `ps_live_…` for production. */
  apiKey: string;
  /** Defaults to `https://api.peppol.sh`. A trailing slash is tolerated. */
  baseUrl?: string;
  /** Defaults to `globalThis.fetch`. */
  fetch?: FetchLike;
  /** Per-request timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;
  /** Extra attempts after a retryable failure. Defaults to 2. */
  maxRetries?: number;
  /**
   * Overrides how the client waits between retries. Exists so tests and
   * custom schedulers do not have to sit through real backoff delays.
   */
  sleep?: (ms: number) => Promise<void>;
}

export const SDK_VERSION = "0.1.0";
export const DEFAULT_BASE_URL = "https://api.peppol.sh";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 2;

/** Backoff is `BASE * 2^attempt` plus jitter, never more than `MAX`. */
const RETRY_BASE_MS = 250;
const RETRY_MAX_MS = 2_000;

export type Health = components["schemas"]["HealthResponse"];

/** Body of `POST /v1/signup`. */
export type SignupParams =
  paths["/v1/signup"]["post"]["requestBody"]["content"]["application/json"];

/** The new account plus its one-time sandbox API key. */
export type SignupResponse =
  paths["/v1/signup"]["post"]["responses"][201]["content"]["application/json"];

export class Peppol {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;

  readonly #apiKey: string;
  readonly #fetch: FetchLike;
  readonly #sleep: (ms: number) => Promise<void>;

  readonly account: Account;
  readonly companies: Companies;
  readonly documents: Documents;
  readonly events: Events;
  readonly kyc: Kyc;
  readonly lookup: Lookup;
  readonly validate: Validate;
  readonly webhooks: Webhooks;
  readonly workspaces: Workspaces;

  constructor(options: PeppolOptions) {
    if (!options.apiKey) {
      throw new PeppolError("apiKey is required");
    }
    this.#apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.#sleep = options.sleep ?? defaultSleep;

    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new PeppolError(
        "No fetch implementation found. Pass one via the `fetch` option.",
      );
    }
    this.#fetch = fetchImpl;

    this.account = new Account(this.#request);
    this.companies = new Companies(this.#request);
    this.documents = new Documents(this.#request);
    this.events = new Events(this.#request);
    this.kyc = new Kyc(this.#request);
    this.lookup = new Lookup(this.#request);
    this.validate = new Validate(this.#request);
    this.webhooks = new Webhooks(this.#request);
    this.workspaces = new Workspaces(this.#request);
  }

  /**
   * `POST /v1/signup` — creates an account and returns a sandbox API key.
   * Public: the spec marks it `security: []`, so no key is sent.
   * The returned `api_key` is shown once; store it before you lose it.
   */
  signup(params: SignupParams): Promise<SignupResponse> {
    return this.#request<SignupResponse>({
      method: "POST",
      path: "/v1/signup",
      body: params,
      auth: false,
    });
  }

  /** `GET /v1/health` — liveness probe with per-dependency checks. */
  health(): Promise<Health> {
    return this.#request<Health>({ method: "GET", path: "/v1/health" });
  }

  readonly #request: RequestFn = async <T>(
    options: RequestOptions,
  ): Promise<T> => {
    const url = new URL(this.baseUrl + options.path);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }

    const headers = new Headers({
      accept: "application/json",
      "x-peppol-sdk": `@peppol-sh/sdk/${SDK_VERSION}`,
    });
    if (options.auth !== false) {
      headers.set("authorization", `Bearer ${this.#apiKey}`);
    }
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
    }
    for (const [key, value] of Object.entries(options.headers ?? {})) {
      headers.set(key, value);
    }
    const body =
      options.body === undefined ? undefined : JSON.stringify(options.body);

    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.timeoutMs);
      const abortOuter = () => controller.abort();
      options.signal?.addEventListener("abort", abortOuter);

      let response: Response;
      try {
        response = await this.#fetch(url.toString(), {
          method: options.method,
          headers,
          body,
          signal: controller.signal,
        });
      } catch (cause) {
        if (timedOut) {
          throw new PeppolTimeoutError(
            `Request to ${options.method} ${options.path} timed out after ${this.timeoutMs}ms`,
            this.timeoutMs,
          );
        }
        if (options.signal?.aborted) throw cause;
        if (options.method === "GET" && attempt < this.maxRetries) {
          await this.#sleep(backoffMs(attempt));
          continue;
        }
        throw new PeppolConnectionError(
          `Could not reach ${url.origin}: ${describe(cause)}`,
          { cause },
        );
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", abortOuter);
      }

      if (!response.ok) {
        const rawBody = await response.text();
        const error = errorFromResponse(
          response.status,
          response.headers,
          parseJson(rawBody),
          rawBody,
        );
        const retryable =
          response.status === 429 ||
          (response.status >= 500 && options.method === "GET");
        if (retryable && attempt < this.maxRetries) {
          const retryAfter = parseRetryAfter(
            response.headers.get("retry-after"),
          );
          await this.#sleep(
            retryAfter === undefined
              ? backoffMs(attempt)
              : Math.min(retryAfter * 1000, RETRY_MAX_MS),
          );
          continue;
        }
        throw error;
      }

      return (await readBody<T>(response)) as T;
    }
  };
}

async function readBody<T>(response: Response): Promise<T | undefined> {
  if (response.status === 204) return undefined;
  const raw = await response.text();
  if (raw === "") return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) return JSON.parse(raw) as T;
  return raw as T;
}

/** Parses JSON, returning `undefined` rather than throwing on malformed input. */
function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function backoffMs(attempt: number): number {
  const exponential = RETRY_BASE_MS * 2 ** attempt;
  const jitter = Math.random() * RETRY_BASE_MS;
  return Math.min(exponential + jitter, RETRY_MAX_MS);
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
