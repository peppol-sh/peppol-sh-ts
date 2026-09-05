import type { RequestFn } from "../client";
import type { paths } from "../generated/types";

type CollectionPath = paths["/v1/companies"];
type ItemPath = paths["/v1/companies/{id}"];

/** Body accepted by `POST /v1/companies`. `name` and `country` are required. */
export type CompanyCreateParams =
  CollectionPath["post"]["requestBody"]["content"]["application/json"];

/**
 * A company as `POST /v1/companies` returns it — carries the caller's
 * workspace `role` and omits `updated_at`.
 */
export type Company =
  CollectionPath["post"]["responses"][201]["content"]["application/json"];

/** The `{ data }` envelope `GET /v1/companies` returns. */
export type CompanyList =
  CollectionPath["get"]["responses"][200]["content"]["application/json"];

/** A company as it appears in a `GET /v1/companies` list — a reduced shape. */
export type CompanyListItem = NonNullable<CompanyList["data"]>[number];

/** The full company shape `GET`/`PATCH` on a single company return. */
export type CompanyDetail =
  ItemPath["get"]["responses"][200]["content"]["application/json"];

/**
 * Body accepted by `PATCH /v1/companies/{id}` — a partial update. At least one
 * updatable field must be present.
 */
export type CompanyUpdateParams =
  ItemPath["patch"]["requestBody"]["content"]["application/json"];

/** `/v1/companies` endpoints — the business entities that send documents. */
export class Companies {
  readonly request: RequestFn;

  constructor(request: RequestFn) {
    this.request = request;
  }

  /** `POST /v1/companies` — create a company in the caller's workspace. */
  create(params: CompanyCreateParams): Promise<Company> {
    return this.request<Company>({
      method: "POST",
      path: "/v1/companies",
      body: params,
    });
  }

  /** `GET /v1/companies` — every company in the workspace, newest first. */
  list(): Promise<CompanyList> {
    return this.request<CompanyList>({ method: "GET", path: "/v1/companies" });
  }

  /** `GET /v1/companies/{id}` — full details for one company. */
  get(id: string): Promise<CompanyDetail> {
    return this.request<CompanyDetail>({
      method: "GET",
      path: `/v1/companies/${encodeURIComponent(id)}`,
    });
  }

  /** `PATCH /v1/companies/{id}` — update the given fields. Owners and admins only. */
  update(id: string, params: CompanyUpdateParams): Promise<CompanyDetail> {
    return this.request<CompanyDetail>({
      method: "PATCH",
      path: `/v1/companies/${encodeURIComponent(id)}`,
      body: params,
    });
  }
}
