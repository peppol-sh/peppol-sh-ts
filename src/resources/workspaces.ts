import type { RequestFn } from "../client";
import type { paths } from "../generated/types";

/** A workspace as the API returns it, including the caller's `role`. */
export type Workspace =
  paths["/v1/workspaces"]["post"]["responses"][201]["content"]["application/json"];

/** Body of `POST /v1/workspaces`. */
export type CreateWorkspaceParams =
  paths["/v1/workspaces"]["post"]["requestBody"]["content"]["application/json"];

/** Result of `GET /v1/workspaces`. */
export type WorkspaceList =
  paths["/v1/workspaces"]["get"]["responses"][200]["content"]["application/json"];

/** Body of `PATCH /v1/workspaces/{id}`. */
export type UpdateWorkspaceParams =
  paths["/v1/workspaces/{id}"]["patch"]["requestBody"]["content"]["application/json"];

/** Result of `DELETE /v1/workspaces/{id}`. */
export type WorkspaceDeleted =
  paths["/v1/workspaces/{id}"]["delete"]["responses"][200]["content"]["application/json"];

/** Result of `GET /v1/workspaces/{id}/members`. */
export type WorkspaceMemberList =
  paths["/v1/workspaces/{id}/members"]["get"]["responses"][200]["content"]["application/json"];

/** Body of `POST /v1/workspaces/{id}/members`. */
export type InviteMemberParams =
  paths["/v1/workspaces/{id}/members"]["post"]["requestBody"]["content"]["application/json"];

/** Body of `PATCH /v1/workspaces/{id}/members/{accountId}`. */
export type ChangeMemberRoleParams =
  paths["/v1/workspaces/{id}/members/{accountId}"]["patch"]["requestBody"]["content"]["application/json"];

/** Body of `POST /v1/workspaces/{id}/transfer-ownership`. */
export type TransferOwnershipParams =
  paths["/v1/workspaces/{id}/transfer-ownership"]["post"]["requestBody"]["content"]["application/json"];

/** Query of `GET /v1/workspaces/{id}/audit`. */
export type ListWorkspaceAuditEventsParams = NonNullable<
  paths["/v1/workspaces/{id}/audit"]["get"]["parameters"]["query"]
>;

/** One page of workspace audit events. */
export type WorkspaceAuditEventPage =
  paths["/v1/workspaces/{id}/audit"]["get"]["responses"][200]["content"]["application/json"];

/** `/v1/workspaces` endpoints — the billing and access-control boundary. */
export class Workspaces {
  readonly request: RequestFn;

  constructor(request: RequestFn) {
    this.request = request;
  }

  /** `POST /v1/workspaces` — creates a workspace owned by the caller. */
  create(params: CreateWorkspaceParams): Promise<Workspace> {
    return this.request<Workspace>({
      method: "POST",
      path: "/v1/workspaces",
      body: params,
    });
  }

  /** `GET /v1/workspaces` — every workspace the account belongs to. */
  list(): Promise<WorkspaceList> {
    return this.request<WorkspaceList>({
      method: "GET",
      path: "/v1/workspaces",
    });
  }

  /** `GET /v1/workspaces/{id}` — one workspace, with the caller's role. */
  get(id: string): Promise<Workspace> {
    return this.request<Workspace>({
      method: "GET",
      path: `/v1/workspaces/${encodeURIComponent(id)}`,
    });
  }

  /** `PATCH /v1/workspaces/{id}` — owners and admins only. */
  update(id: string, params: UpdateWorkspaceParams): Promise<Workspace> {
    return this.request<Workspace>({
      method: "PATCH",
      path: `/v1/workspaces/${encodeURIComponent(id)}`,
      body: params,
    });
  }

  /** `DELETE /v1/workspaces/{id}` — owners only. */
  delete(id: string): Promise<WorkspaceDeleted> {
    return this.request<WorkspaceDeleted>({
      method: "DELETE",
      path: `/v1/workspaces/${encodeURIComponent(id)}`,
    });
  }

  /** `GET /v1/workspaces/{id}/members` — every member and their role. */
  listMembers(id: string): Promise<WorkspaceMemberList> {
    return this.request<WorkspaceMemberList>({
      method: "GET",
      path: `/v1/workspaces/${encodeURIComponent(id)}/members`,
    });
  }

  /** `POST /v1/workspaces/{id}/members` — owners and admins only. */
  inviteMember(id: string, params: InviteMemberParams): Promise<void> {
    return this.request<void>({
      method: "POST",
      path: `/v1/workspaces/${encodeURIComponent(id)}/members`,
      body: params,
    });
  }

  /** `PATCH /v1/workspaces/{id}/members/{accountId}` — owners only. */
  changeMemberRole(
    id: string,
    accountId: string,
    params: ChangeMemberRoleParams,
  ): Promise<void> {
    return this.request<void>({
      method: "PATCH",
      path: `/v1/workspaces/${encodeURIComponent(id)}/members/${encodeURIComponent(accountId)}`,
      body: params,
    });
  }

  /**
   * `DELETE /v1/workspaces/{id}/members/{accountId}` — also cascade-revokes
   * that member's API keys for this workspace.
   */
  removeMember(id: string, accountId: string): Promise<void> {
    return this.request<void>({
      method: "DELETE",
      path: `/v1/workspaces/${encodeURIComponent(id)}/members/${encodeURIComponent(accountId)}`,
    });
  }

  /**
   * `POST /v1/workspaces/{id}/transfer-ownership` — makes the target account
   * an owner and demotes the caller to admin.
   */
  transferOwnership(
    id: string,
    params: TransferOwnershipParams,
  ): Promise<void> {
    return this.request<void>({
      method: "POST",
      path: `/v1/workspaces/${encodeURIComponent(id)}/transfer-ownership`,
      body: params,
    });
  }

  /** `GET /v1/workspaces/{id}/audit` — audit events for this workspace. */
  listAuditEvents(
    id: string,
    params?: ListWorkspaceAuditEventsParams,
  ): Promise<WorkspaceAuditEventPage> {
    return this.request<WorkspaceAuditEventPage>({
      method: "GET",
      path: `/v1/workspaces/${encodeURIComponent(id)}/audit`,
      query: params,
    });
  }
}
