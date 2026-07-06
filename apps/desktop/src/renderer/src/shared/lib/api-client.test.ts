import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { server } from "../../../../../tests/msw/server";
import { apiGet, apiPost } from "./api-client";
import { invalidateAuthTokenCache } from "./auth-token";

const URL_BASE = "http://localhost:4000";
const itemSchema = z.object({ id: z.string() });

describe("api-client", () => {
  beforeEach(() => {
    invalidateAuthTokenCache();
    Object.assign(window, {
      api: {
        invoke: vi
          .fn()
          .mockResolvedValue({ ok: true, data: { token: "tok-abc" } }),
      },
    });
  });

  afterEach(() => {
    invalidateAuthTokenCache();
  });

  it("injects the bearer token from the auth store", async () => {
    let authHeader: string | null = null;
    server.use(
      http.get(`${URL_BASE}/v2/api/thing`, ({ request }) => {
        authHeader = request.headers.get("authorization");
        return HttpResponse.json({ id: "1" });
      }),
    );

    await apiGet("/v2/api/thing", itemSchema);
    expect(authHeader).toBe("Bearer tok-abc");
  });

  it("omits the auth header when no token is stored", async () => {
    Object.assign(window, {
      api: {
        invoke: vi.fn().mockResolvedValue({ ok: true, data: { token: null } }),
      },
    });
    let authHeader: string | null = "sentinel";
    server.use(
      http.get(`${URL_BASE}/v2/api/thing`, ({ request }) => {
        authHeader = request.headers.get("authorization");
        return HttpResponse.json({ id: "1" });
      }),
    );

    await apiGet("/v2/api/thing", itemSchema);
    expect(authHeader).toBeNull();
  });

  it("maps a 401 to UNAUTHORIZED with the status attached", async () => {
    server.use(
      http.get(
        `${URL_BASE}/v2/api/thing`,
        () => new HttpResponse(null, { status: 401 }),
      ),
    );

    await expect(apiGet("/v2/api/thing", itemSchema)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("maps a 500 to SERVER", async () => {
    server.use(
      http.get(
        `${URL_BASE}/v2/api/thing`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    await expect(apiGet("/v2/api/thing", itemSchema)).rejects.toMatchObject({
      code: "SERVER",
    });
  });

  it("rejects with VALIDATION when the response fails the schema", async () => {
    server.use(
      http.get(`${URL_BASE}/v2/api/thing`, () =>
        HttpResponse.json({ wrong: true }),
      ),
    );

    await expect(apiGet("/v2/api/thing", itemSchema)).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("serializes search params and skips undefined values", async () => {
    let url = "";
    server.use(
      http.get(`${URL_BASE}/v2/api/thing`, ({ request }) => {
        url = request.url;
        return HttpResponse.json({ id: "1" });
      }),
    );

    await apiGet("/v2/api/thing", itemSchema, {
      searchParams: { page: 2, search: undefined, active: true },
    });
    expect(url).toContain("page=2");
    expect(url).toContain("active=true");
    expect(url).not.toContain("search=");
  });

  it("accepts an empty body for POST when the schema allows it", async () => {
    server.use(
      http.post(
        `${URL_BASE}/v2/api/thing/pin`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(
      apiPost("/v2/api/thing/pin", undefined, z.unknown()),
    ).resolves.toBeUndefined();
  });
});
