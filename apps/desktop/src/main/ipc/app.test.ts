import type { IpcResult } from "@myvng/shared";
import { describe, expect, it, vi } from "vitest";
import { registerAppHandlers } from "./app";

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
  app: {
    getVersion: vi.fn(() => "9.9.9"),
  },
}));

describe("app:getVersion", () => {
  it("returns the app version and platform", async () => {
    registerAppHandlers();
    const handler = handlers.get("app:getVersion");
    expect(handler).toBeDefined();

    const result = await handler?.(null, undefined);

    expect(result).toEqual({
      ok: true,
      data: { version: "9.9.9", platform: process.platform },
    });
  });
});
