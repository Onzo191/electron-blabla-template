import type { IpcResult } from "@myvng/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerHandler } from "./register";

type WrappedHandler = (
  event: unknown,
  raw: unknown,
) => Promise<IpcResult<unknown>>;

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, WrappedHandler>(),
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: WrappedHandler) => {
      handlers.set(channel, handler);
    }),
  },
}));

function wrapped(channel: string): WrappedHandler {
  const handler = handlers.get(channel);
  if (!handler) throw new Error(`no handler registered for ${channel}`);
  return handler;
}

describe("registerHandler", () => {
  beforeEach(() => {
    handlers.clear();
  });

  it("validates input, calls the handler with the parsed request, and wraps the result", async () => {
    const handler = vi.fn(() => ({ saved: true as const }));
    registerHandler("auth:setToken", handler);

    const result = await wrapped("auth:setToken")(null, { token: "secret" });

    expect(handler).toHaveBeenCalledWith({ token: "secret" });
    expect(result).toEqual({ ok: true, data: { saved: true } });
  });

  it("rejects invalid input with a VALIDATION envelope without calling the handler", async () => {
    const handler = vi.fn(() => ({ saved: true as const }));
    registerHandler("auth:setToken", handler);

    const result = await wrapped("auth:setToken")(null, { token: "" });

    expect(handler).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION");
  });

  it("validates the handler's output before returning it", async () => {
    registerHandler("app:getVersion", () => ({ version: "1.0.0" }) as never);

    const result = await wrapped("app:getVersion")(null, undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION");
      expect(result.error.message).toContain("platform");
    }
  });

  it("converts a thrown error into an error envelope instead of rejecting", async () => {
    registerHandler("app:getVersion", () => {
      throw new Error("boom");
    });

    const result = await wrapped("app:getVersion")(null, undefined);

    expect(result).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: "boom" },
    });
  });
});
