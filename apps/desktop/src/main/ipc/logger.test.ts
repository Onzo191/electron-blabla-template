import type { IpcResult } from "@myvng/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerLoggerHandlers } from "./logger";

type WrappedHandler = (
  event: unknown,
  raw: unknown,
) => Promise<IpcResult<unknown>>;

const { handlers, logMock } = vi.hoisted(() => ({
  handlers: new Map<string, WrappedHandler>(),
  logMock: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: WrappedHandler) => {
      handlers.set(channel, handler);
    }),
  },
}));

vi.mock("../services/logger", () => ({
  logger: logMock,
}));

function wrapped(channel: string): WrappedHandler {
  const handler = handlers.get(channel);
  if (!handler) throw new Error(`no handler registered for ${channel}`);
  return handler;
}

describe("log:write", () => {
  beforeEach(() => {
    handlers.clear();
    logMock.error.mockClear();
    logMock.warn.mockClear();
    logMock.info.mockClear();
    logMock.debug.mockClear();
    registerLoggerHandlers();
  });

  it("forwards a renderer log entry to the matching level", async () => {
    const result = await wrapped("log:write")(null, {
      level: "warn",
      message: "low disk space",
    });

    expect(result).toEqual({ ok: true, data: { ok: true } });
    expect(logMock.warn).toHaveBeenCalledWith("[renderer] low disk space");
  });

  it("includes meta in the logged message when present", async () => {
    await wrapped("log:write")(null, {
      level: "error",
      message: "request failed",
      meta: '{"status":500}',
    });

    expect(logMock.error).toHaveBeenCalledWith(
      '[renderer] request failed {"status":500}',
    );
  });

  it("rejects an invalid level without logging anything", async () => {
    const result = await wrapped("log:write")(null, {
      level: "verbose",
      message: "hello",
    });

    expect(result.ok).toBe(false);
    expect(logMock.info).not.toHaveBeenCalled();
  });
});
