import { describe, expect, it } from "vitest";
import { compareVersions, isVersionBelow } from "./update";

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("returns -1 when the first version is lower", () => {
    expect(compareVersions("1.2.3", "1.3.0")).toBe(-1);
    expect(compareVersions("1.9.9", "2.0.0")).toBe(-1);
  });

  it("returns 1 when the first version is higher", () => {
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
  });

  it("treats missing trailing segments as zero", () => {
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("1.2.1", "1.2")).toBe(1);
  });
});

describe("isVersionBelow", () => {
  it("is true when current is older than the minimum", () => {
    expect(isVersionBelow("1.0.0", "1.2.0")).toBe(true);
  });

  it("is false when current meets or exceeds the minimum", () => {
    expect(isVersionBelow("1.2.0", "1.2.0")).toBe(false);
    expect(isVersionBelow("1.3.0", "1.2.0")).toBe(false);
  });
});
