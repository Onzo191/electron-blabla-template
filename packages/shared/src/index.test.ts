import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("@myvng/shared", () => {
  it("parses with zod", () => {
    expect(z.string().parse("ok")).toBe("ok");
  });
});
