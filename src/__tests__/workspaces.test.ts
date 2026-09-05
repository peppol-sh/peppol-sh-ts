import { describe, expect, it } from "vitest";
import { Peppol, PeppolNotFoundError } from "../index";
import { fetchStub, jsonResponse } from "./helpers";

const WORKSPACE = {
  id: "wsp_abc123",
  name: "Acme Trading",
  role: "owner",
  credits: 42,
  suspended: false,
  mode: "live",
} as const;

function client(...responses: Array<Response | Error>) {
  const fetch = fetchStub(...responses);
  return {
    fetch,
    peppol: new Peppol({ apiKey: "ps_test_abc", fetch, maxRetries: 0 }),
  };
}

describe("workspaces.create()", () => {
  it("POSTs /v1/workspaces with the name", async () => {
    const { fetch, peppol } = client(jsonResponse(WORKSPACE, 201));

    const workspace = await peppol.workspaces.create({ name: "Acme Trading" });

    expect(workspace).toEqual(WORKSPACE);
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/workspaces");
    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].body).toBe('{"name":"Acme Trading"}');
  });
});

describe("workspaces.list()", () => {
  it("GETs /v1/workspaces and returns the data envelope", async () => {
    const { fetch, peppol } = client(jsonResponse({ data: [WORKSPACE] }));

    const result = await peppol.workspaces.list();

    expect(result).toEqual({ data: [WORKSPACE] });
    expect(fetch.calls[0].url).toBe("https://api.peppol.sh/v1/workspaces");
    expect(fetch.calls[0].method).toBe("GET");
  });
});

describe("workspaces.get()", () => {
  it("GETs /v1/workspaces/{id}", async () => {
    const { fetch, peppol } = client(jsonResponse(WORKSPACE));

    const workspace = await peppol.workspaces.get("wsp_abc123");

    expect(workspace).toEqual(WORKSPACE);
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/workspaces/wsp_abc123",
    );
    expect(fetch.calls[0].method).toBe("GET");
  });

  it("URL-encodes the workspace id", async () => {
    const { fetch, peppol } = client(jsonResponse(WORKSPACE));

    await peppol.workspaces.get("wsp a/b");

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/workspaces/wsp%20a%2Fb",
    );
  });

  it("passes an API error through unchanged", async () => {
    const { peppol } = client(
      jsonResponse(
        {
          error: {
            type: "not_found",
            code: "workspace_not_found",
            message: "Workspace not found",
          },
        },
        404,
      ),
    );

    const thrown = await peppol.workspaces
      .get("wsp_missing")
      .catch((err: unknown) => err);

    expect(thrown).toBeInstanceOf(PeppolNotFoundError);
    expect((thrown as PeppolNotFoundError).code).toBe("workspace_not_found");
  });
});

describe("workspaces.update()", () => {
  it("PATCHes /v1/workspaces/{id} with the changed fields", async () => {
    const { fetch, peppol } = client(jsonResponse(WORKSPACE));

    await peppol.workspaces.update("wsp_abc123", { name: "Acme BV" });

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/workspaces/wsp_abc123",
    );
    expect(fetch.calls[0].method).toBe("PATCH");
    expect(fetch.calls[0].body).toBe('{"name":"Acme BV"}');
  });
});

describe("workspaces.delete()", () => {
  it("DELETEs /v1/workspaces/{id}", async () => {
    const { fetch, peppol } = client(jsonResponse({ deleted: true }));

    const result = await peppol.workspaces.delete("wsp_abc123");

    expect(result).toEqual({ deleted: true });
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/workspaces/wsp_abc123",
    );
    expect(fetch.calls[0].method).toBe("DELETE");
    expect(fetch.calls[0].body).toBeUndefined();
  });
});

describe("workspaces.listMembers()", () => {
  it("GETs /v1/workspaces/{id}/members", async () => {
    const members = {
      data: [{ account_id: "acc_1", email: "a@b.com", role: "owner" }],
    };
    const { fetch, peppol } = client(jsonResponse(members));

    const result = await peppol.workspaces.listMembers("wsp_abc123");

    expect(result).toEqual(members);
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/workspaces/wsp_abc123/members",
    );
    expect(fetch.calls[0].method).toBe("GET");
  });
});

describe("workspaces.inviteMember()", () => {
  it("POSTs /v1/workspaces/{id}/members with the invite", async () => {
    const { fetch, peppol } = client(new Response(null, { status: 201 }));

    await peppol.workspaces.inviteMember("wsp_abc123", {
      email: "new@acme.com",
      role: "admin",
    });

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/workspaces/wsp_abc123/members",
    );
    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].body).toBe('{"email":"new@acme.com","role":"admin"}');
  });
});

describe("workspaces.changeMemberRole()", () => {
  it("PATCHes /v1/workspaces/{id}/members/{accountId} with the role", async () => {
    const { fetch, peppol } = client(jsonResponse({ ok: true }));

    await peppol.workspaces.changeMemberRole("wsp_abc123", "acc_1", {
      role: "admin",
    });

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/workspaces/wsp_abc123/members/acc_1",
    );
    expect(fetch.calls[0].method).toBe("PATCH");
    expect(fetch.calls[0].body).toBe('{"role":"admin"}');
  });
});

describe("workspaces.removeMember()", () => {
  it("DELETEs /v1/workspaces/{id}/members/{accountId}, encoding both ids", async () => {
    const { fetch, peppol } = client(jsonResponse({ ok: true }));

    await peppol.workspaces.removeMember("wsp a", "acc/1");

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/workspaces/wsp%20a/members/acc%2F1",
    );
    expect(fetch.calls[0].method).toBe("DELETE");
  });
});

describe("workspaces.transferOwnership()", () => {
  it("POSTs /v1/workspaces/{id}/transfer-ownership with the account id", async () => {
    const { fetch, peppol } = client(jsonResponse({ ok: true }));

    await peppol.workspaces.transferOwnership("wsp_abc123", {
      account_id: "acc_2",
    });

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/workspaces/wsp_abc123/transfer-ownership",
    );
    expect(fetch.calls[0].method).toBe("POST");
    expect(fetch.calls[0].body).toBe('{"account_id":"acc_2"}');
  });
});

describe("workspaces.listAuditEvents()", () => {
  it("GETs /v1/workspaces/{id}/audit with limit and cursor", async () => {
    const page = { data: [], has_more: false, next_cursor: null };
    const { fetch, peppol } = client(jsonResponse(page));

    const result = await peppol.workspaces.listAuditEvents("wsp_abc123", {
      limit: 25,
      cursor: "cur_1",
    });

    expect(result).toEqual(page);
    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/workspaces/wsp_abc123/audit?limit=25&cursor=cur_1",
    );
    expect(fetch.calls[0].method).toBe("GET");
  });

  it("sends no query string when called without parameters", async () => {
    const { fetch, peppol } = client(jsonResponse({ data: [] }));

    await peppol.workspaces.listAuditEvents("wsp_abc123");

    expect(fetch.calls[0].url).toBe(
      "https://api.peppol.sh/v1/workspaces/wsp_abc123/audit",
    );
  });
});
