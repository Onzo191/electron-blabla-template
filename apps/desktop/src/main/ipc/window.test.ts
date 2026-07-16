import type { IpcResult } from "@myvng/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerWindowHandlers } from "./window";

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

describe("window:setTitleBarTheme", () => {
  const invoke = (raw: unknown): Promise<IpcResult<unknown>> => {
    const handler = handlers.get("window:setTitleBarTheme");
    if (!handler) throw new Error("handler not registered");
    return handler(null, raw);
  };

  beforeEach(() => {
    handlers.clear();
  });

  it("calls setTitleBarOverlay with theme colors on win32", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    const setTitleBarOverlay = vi.fn();

    registerWindowHandlers(
      () => ({ setTitleBarOverlay }) as unknown as Electron.BrowserWindow,
    );
    const result = await invoke({ theme: "dark" });

    expect(result).toEqual({ ok: true, data: { ok: true } });
    expect(setTitleBarOverlay).toHaveBeenCalledWith(
      expect.objectContaining({ color: expect.any(String) }),
    );
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("is a no-op on non-win32 platforms", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "darwin" });
    const setTitleBarOverlay = vi.fn();

    registerWindowHandlers(
      () => ({ setTitleBarOverlay }) as unknown as Electron.BrowserWindow,
    );
    const result = await invoke({ theme: "light" });

    expect(result).toEqual({ ok: true, data: { ok: true } });
    expect(setTitleBarOverlay).not.toHaveBeenCalled();
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("is a no-op when no window is available", async () => {
    registerWindowHandlers(() => null);
    const result = await invoke({ theme: "light" });

    expect(result).toEqual({ ok: true, data: { ok: true } });
  });
});
