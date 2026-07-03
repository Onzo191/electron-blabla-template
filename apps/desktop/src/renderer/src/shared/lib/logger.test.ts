import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

const invoke = vi.fn().mockResolvedValue({ ok: true, data: { ok: true } });

vi.stubGlobal("window", { ...window, api: { invoke } });

describe("renderer logger", () => {
  afterEach(() => {
    invoke.mockClear();
  });

  it("sends a plain message over the log:write channel", () => {
    logger.info("hello");

    expect(invoke).toHaveBeenCalledWith("log:write", {
      level: "info",
      message: "hello",
      meta: undefined,
    });
  });

  it("formats an Error meta as its stack", () => {
    const error = new Error("boom");

    logger.error("request failed", error);

    expect(invoke).toHaveBeenCalledWith("log:write", {
      level: "error",
      message: "request failed",
      meta: error.stack,
    });
  });

  it("JSON-stringifies a plain object meta", () => {
    logger.warn("slow query", { ms: 42 });

    expect(invoke).toHaveBeenCalledWith("log:write", {
      level: "warn",
      message: "slow query",
      meta: '{"ms":42}',
    });
  });
});
