import { afterEach, describe, expect, it, vi } from "vitest";
import { IpcInvokeError, invokeOrThrow } from "./ipc-client";

const invoke = vi.fn();

vi.stubGlobal("window", { ...window, api: { invoke } });

describe("invokeOrThrow", () => {
  afterEach(() => {
    invoke.mockClear();
  });

  it("resolves with the unwrapped data on success", async () => {
    invoke.mockResolvedValue({ ok: true, data: { version: "1.0.0" } });

    const data = await invokeOrThrow("app:getVersion", undefined);

    expect(data).toEqual({ version: "1.0.0" });
  });

  it("throws an IpcInvokeError carrying the AppError code on failure", async () => {
    invoke.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "boom" },
    });

    await expect(invokeOrThrow("app:getVersion", undefined)).rejects.toThrow(
      IpcInvokeError,
    );
    await expect(
      invokeOrThrow("app:getVersion", undefined),
    ).rejects.toMatchObject({ code: "INTERNAL", message: "boom" });
  });
});
