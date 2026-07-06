import { toAppError } from "@myvng/shared";
import type { z } from "zod";
import { getAuthToken, invalidateAuthTokenCache } from "./auth-token";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(
    message: string,
    code: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : {},
    );
    this.name = "ApiError";
    this.code = code;
    this.status = options?.status;
  }
}

export function statusToCode(status: number): string {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER";
  return "REQUEST_FAILED";
}

export type SearchParams = Record<
  string,
  string | number | boolean | undefined
>;

export function buildApiUrl(path: string, searchParams?: SearchParams): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Authorization header for the backend; shared with the SSE client. */
export async function buildAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type RequestOptions<T> = {
  schema: z.ZodType<T>;
  body?: unknown;
  searchParams?: SearchParams;
  signal?: AbortSignal;
};

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  { schema, body, searchParams, signal }: RequestOptions<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildApiUrl(path, searchParams), {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(await buildAuthHeaders()),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request aborted", "ABORTED", { cause: error });
    }
    throw new ApiError(`${path} failed to connect`, "NETWORK", {
      cause: error,
    });
  }

  if (!response.ok) {
    if (response.status === 401) invalidateAuthTokenCache();
    throw new ApiError(
      `${path} responded with ${response.status}`,
      statusToCode(response.status),
      { status: response.status },
    );
  }

  try {
    const text = await response.text();
    const json: unknown = text === "" ? undefined : JSON.parse(text);
    return schema.parse(json);
  } catch (error) {
    const appError = toAppError(error);
    throw new ApiError(appError.message, appError.code, { cause: error });
  }
}

export async function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: { searchParams?: SearchParams; signal?: AbortSignal },
): Promise<T> {
  return request("GET", path, { schema, ...options });
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  options?: { searchParams?: SearchParams; signal?: AbortSignal },
): Promise<T> {
  return request("POST", path, { schema, body, ...options });
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  options?: { searchParams?: SearchParams; signal?: AbortSignal },
): Promise<T> {
  return request("PATCH", path, { schema, body, ...options });
}

export async function apiDelete<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: { searchParams?: SearchParams; signal?: AbortSignal },
): Promise<T> {
  return request("DELETE", path, { schema, ...options });
}
