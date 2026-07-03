import { describe, expect, it } from "vitest";
import { toAppError } from "./error";

describe("toAppError", () => {
  it("uses a string .code property when present on the error", () => {
    class CustomError extends Error {
      readonly code = "CUSTOM";
    }
    const original = new CustomError("boom");

    const appError = toAppError(original);

    expect(appError).toEqual({
      code: "CUSTOM",
      message: "boom",
      cause: original,
    });
  });

  it("falls back to INTERNAL for a plain Error", () => {
    const original = new Error("boom");

    const appError = toAppError(original);

    expect(appError.code).toBe("INTERNAL");
    expect(appError.message).toBe("boom");
    expect(appError.cause).toBe(original);
  });

  it("prefers an existing native cause over the error itself", () => {
    const root = new Error("root cause");
    const wrapped = new Error("wrapped", { cause: root });

    const appError = toAppError(wrapped);

    expect(appError.cause).toBe(root);
  });

  it("maps non-Error values to UNKNOWN", () => {
    const appError = toAppError("boom");

    expect(appError).toEqual({
      code: "UNKNOWN",
      message: "boom",
      cause: "boom",
    });
  });
});
