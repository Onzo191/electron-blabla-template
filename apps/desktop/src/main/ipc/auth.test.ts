import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IpcResult } from "@myvng/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSecureTokenStore } from "../services/secure-store";
import { registerAuthHandlers } from "./auth";

type WrappedHandler = (
  event: unknown,
  raw: unknown,
) => Promise<IpcResult<unknown>>;

const { handlers, cryptoState } = vi.hoisted(() => ({
  handlers: new Map<string, WrappedHandler>(),
  cryptoState: { encryptionAvailable: true },
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: WrappedHandler) => {
      handlers.set(channel, handler);
    }),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => cryptoState.encryptionAvailable),
    encryptString: vi.fn((plain: string) =>
      Buffer.from(
        `enc:${Buffer.from(plain, "utf8").toString("base64")}`,
        "utf8",
      ),
    ),
    decryptString: vi.fn((encrypted: Buffer) =>
      Buffer.from(
        encrypted.toString("utf8").replace(/^enc:/, ""),
        "base64",
      ).toString("utf8"),
    ),
  },
}));

describe("auth handlers", () => {
  let dir: string;

  const invoke = (
    channel: string,
    raw: unknown,
  ): Promise<IpcResult<unknown>> => {
    const handler = handlers.get(channel);
    if (!handler) throw new Error(`no handler registered for ${channel}`);
    return handler(null, raw);
  };

  beforeEach(() => {
    handlers.clear();
    cryptoState.encryptionAvailable = true;
    dir = mkdtempSync(join(tmpdir(), "secure-store-test-"));
    registerAuthHandlers(createSecureTokenStore({ dir }));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("round-trips a token through setToken and getToken", async () => {
    const set = await invoke("auth:setToken", { token: "my-secret" });
    expect(set).toEqual({ ok: true, data: { saved: true } });

    const get = await invoke("auth:getToken", undefined);
    expect(get).toEqual({ ok: true, data: { token: "my-secret" } });
  });

  it("persists the token encrypted, never in plaintext", async () => {
    await invoke("auth:setToken", { token: "my-secret" });

    const file = join(dir, "secure-token.bin");
    expect(existsSync(file)).toBe(true);
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(file, "utf8")).not.toContain("my-secret");
  });

  it("returns a null token when nothing is stored", async () => {
    const get = await invoke("auth:getToken", undefined);
    expect(get).toEqual({ ok: true, data: { token: null } });
  });

  it("fails secure when OS encryption is unavailable", async () => {
    cryptoState.encryptionAvailable = false;

    const set = await invoke("auth:setToken", { token: "my-secret" });
    expect(set.ok).toBe(false);
    if (!set.ok) expect(set.error.code).toBe("ENCRYPTION_UNAVAILABLE");
    expect(existsSync(join(dir, "secure-token.bin"))).toBe(false);
  });

  it("rejects an empty token without touching storage", async () => {
    const set = await invoke("auth:setToken", { token: "" });
    expect(set.ok).toBe(false);
    if (!set.ok) expect(set.error.code).toBe("VALIDATION");
    expect(existsSync(join(dir, "secure-token.bin"))).toBe(false);
  });
});
