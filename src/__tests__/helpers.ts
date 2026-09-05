/** Test-only helpers. Not part of the published surface. */

export interface RecordedCall {
  url: string;
  method: string;
  headers: Headers;
  body: string | undefined;
}

export interface FetchStub {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>;
  calls: RecordedCall[];
}

/**
 * Builds a `fetch` stub that records every call and replies with the given
 * responses in order (the last one repeats once the queue runs dry).
 * A response entry may be an `Error` to simulate a network failure.
 */
export function fetchStub(...responses: Array<Response | Error>): FetchStub {
  const calls: RecordedCall[] = [];
  let index = 0;
  const stub = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;
    if (next instanceof Error) throw next;
    return next.clone();
  };
  return Object.assign(stub, { calls });
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}
