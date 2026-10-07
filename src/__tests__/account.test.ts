import { describe, expect, it } from "vitest";
import { Peppol } from "../index";
import { fetchStub, jsonResponse } from "./helpers";

const ACCOUNT = {
  id: "acc_abc123def456",
  email: "agent@bot.com",
  name: "Jane Developer",
  status: "active",
  created_at: "2026-08-27T10:15:00.000Z",
} as const;

function client(...responses: Array<Response | Error>) {
  const fetch = fetchStub(...responses);
  return {
    fetch,
    peppol: new Peppol({ apiKey: "ps_test_abc", fetch, maxRetries: 0 }),
  };
}

describe("signup()", () => {
  it("POSTs /v1/signup with the email and name", async () => {
    const created = {
      id: "acc_abc123def456",
      email: "agent@bot.com",
      status: "active",
      api_key: "ps_test_a1b2c3d4e5f6",
    };
    const { fetch, peppol } = client(jsonResponse(created, 201));

    const account = await peppol.signup({
      email: "agent@bot.com",
      name: "Jane Developer",
    });

    expect(account).toEqual(created);
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/signup");
    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].headers.get("content-type")).toBe("application/json");
    expect(fetch.calls[0].body).toBe(
      '{"email":"agent@bot.com","name":"Jane Developer"}',
    );
  });

  it("sends no authorization header — signup is a public endpoint", async () => {
    const { fetch, peppol } = client(jsonResponse({ id: "acc_1" }, 201));

    await peppol.signup({ email: "agent@bot.com" });

    expect(fetch.calls[0].headers.get("authorization")).toBeNull();
    expect(fetch.calls[0].headers.get("x-peppol-sdk")).toBe(
      "@peppol-sh/sdk/0.2.0",
    );
  });
});

describe("account.get()", () => {
  it("GETs /v1/account and returns the account", async () => {
    const { fetch, peppol } = client(jsonResponse(ACCOUNT));

    const account = await peppol.account.get();

    expect(account).toEqual(ACCOUNT);
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/account");
    expect(fetch.calls[0].method).toBe("GET");
    expect(fetch.calls[0].body).toBeUndefined();
  });
});

describe("account.createKey()", () => {
  it("POSTs /v1/account/keys with the label and sandbox flag", async () => {
    const created = {
      id: "key_1",
      prefix: "ps_live_a1b2c3",
      key: "ps_live_a1b2c3d4e5f6",
      label: "CI/CD pipeline",
      sandbox: false,
    };
    const { fetch, peppol } = client(jsonResponse(created, 201));

    const key = await peppol.account.createKey({
      label: "CI/CD pipeline",
      sandbox: false,
    });

    expect(key).toEqual(created);
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/account/keys");
    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].headers.get("content-type")).toBe("application/json");
    expect(fetch.calls[0].body).toBe(
      '{"label":"CI/CD pipeline","sandbox":false}',
    );
  });

  it("sends an empty body when no parameters are given", async () => {
    const { fetch, peppol } = client(jsonResponse({ id: "key_2" }, 201));

    await peppol.account.createKey();

    expect(fetch.calls[0].body).toBe("{}");
  });
});

describe("account.revokeKey()", () => {
  it("DELETEs /v1/account/keys/{prefix} with the prefix URL-encoded", async () => {
    const { fetch, peppol } = client(
      jsonResponse({ revoked: true, prefix: "ps_test_a1b2c3..." }),
    );

    const result = await peppol.account.revokeKey("ps_test_a1b2c3...");

    expect(result).toEqual({ revoked: true, prefix: "ps_test_a1b2c3..." });
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/account/keys/ps_test_a1b2c3...",
    );
    expect(fetch.calls[0].method).toBe("DELETE");
  });

  it("escapes a prefix that contains URL-significant characters", async () => {
    const { fetch, peppol } = client(jsonResponse({ revoked: true }));

    await peppol.account.revokeKey("ps_test_a/b?c");

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/account/keys/ps_test_a%2Fb%3Fc",
    );
  });
});

describe("account.listAuditEvents()", () => {
  it("GETs /v1/account/audit with limit and cursor", async () => {
    const page = {
      data: [{ id: "aud_1", action: "api_key.created" }],
      has_more: true,
      next_cursor: "cur_2",
    };
    const { fetch, peppol } = client(jsonResponse(page));

    const result = await peppol.account.listAuditEvents({
      limit: 10,
      cursor: "cur_1",
    });

    expect(result).toEqual(page);
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/account/audit?limit=10&cursor=cur_1",
    );
    expect(fetch.calls[0].method).toBe("GET");
  });

  it("sends no query string when called without parameters", async () => {
    const { fetch, peppol } = client(jsonResponse({ data: [] }));

    await peppol.account.listAuditEvents();

    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/account/audit");
  });
});

describe("account.getUsage()", () => {
  it("GETs /v1/account/usage with the days window", async () => {
    const usage = { period_days: 7, daily: [], totals: { documents: 3 } };
    const { fetch, peppol } = client(jsonResponse(usage));

    const result = await peppol.account.getUsage({ days: 7 });

    expect(result).toEqual(usage);
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/account/usage?days=7",
    );
  });

  it("sends no query string when called without parameters", async () => {
    const { fetch, peppol } = client(jsonResponse({ daily: [] }));

    await peppol.account.getUsage();

    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/account/usage");
  });
});
