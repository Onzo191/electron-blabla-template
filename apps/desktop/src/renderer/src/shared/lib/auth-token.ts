import { invokeOrThrow } from "./ipc-client";
import { logger } from "./logger";

/**
 * In-memory cache over the safeStorage-backed token (auth:* IPC channels)
 * so every HTTP request doesn't pay an IPC round-trip. The cache is
 * invalidated on 401 responses and on explicit set/clear.
 */
let cached: string | null = null;
let loaded = false;
let inflight: Promise<string | null> | null = null;

export async function getAuthToken(): Promise<string | null> {
  if (loaded) return cached;
  inflight ??= invokeOrThrow("auth:getToken", undefined)
    .then(({ token }) => {
      cached = token;
      loaded = true;
      return token;
    })
    .catch((error: unknown) => {
      // Fail open with "no token": the request then surfaces a 401, which
      // is a clearer signal than dying before the request is made.
      logger.warn("auth token read failed", error);
      return null;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function setAuthToken(token: string): Promise<void> {
  await invokeOrThrow("auth:setToken", { token });
  cached = token;
  loaded = true;
}

export async function clearAuthToken(): Promise<void> {
  await invokeOrThrow("auth:clearToken", undefined);
  cached = null;
  loaded = true;
}

/** Drops only the in-memory copy (e.g. after a 401) — safeStorage is untouched. */
export function invalidateAuthTokenCache(): void {
  cached = null;
  loaded = false;
}
