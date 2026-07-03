import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CodedError, ipcErr, ipcOk, toAppError } from "./errors";

describe("toAppError", () => {
  it("maps ZodError to VALIDATION with issue paths", () => {
    const schema = z.object({ token: z.string() });
    const result = schema.safeParse({ token: 42 });
    if (result.success) throw new Error("expected parse failure");

    const appError = toAppError(result.error);
    expect(appError.code).toBe("VALIDATION");
    expect(appError.message).toContain("token");
  });

  it("preserves the code of a CodedError", () => {
    const appError = toAppError(
      new CodedError("ENCRYPTION_UNAVAILABLE", "no keychain"),
    );
    expect(appError).toEqual({
      code: "ENCRYPTION_UNAVAILABLE",
      message: "no keychain",
    });
  });

  it("maps plain Error to INTERNAL", () => {
    expect(toAppError(new Error("boom"))).toEqual({
      code: "INTERNAL",
      message: "boom",
    });
  });

  it("maps non-Error values to UNKNOWN", () => {
    expect(toAppError("boom")).toEqual({ code: "UNKNOWN", message: "boom" });
  });

  it("never leaks stack traces", () => {
    const appError = toAppError(new Error("boom"));
    expect(Object.keys(appError).sort()).toEqual(["code", "message"]);
  });
});

describe("envelopes", () => {
  it("wraps ok and err", () => {
    expect(ipcOk(1)).toEqual({ ok: true, data: 1 });
    expect(ipcErr({ code: "X", message: "y" })).toEqual({
      ok: false,
      error: { code: "X", message: "y" },
    });
  });
});
