import { describe, expect, it } from "vitest";
import { cleanCitations } from "./clean-citations";

describe("cleanCitations", () => {
  it("numbers unique citation ids in order of first appearance", () => {
    const { text, citationIds } = cleanCitations(
      "Policy says X [ID:handbook.pdf] and Y [ID:faq.md] again [ID:handbook.pdf] ",
    );
    expect(citationIds).toEqual(["handbook.pdf", "faq.md"]);
    expect(text).toContain("[1]");
    expect(text).toContain("[2]");
    expect(text).not.toContain("[ID:");
  });

  it("removes filecite artifacts", () => {
    const { text } = cleanCitations("See filecite for detail");
    expect(text).not.toContain("filecite");
  });

  it("removes turnXfileY artifacts", () => {
    const { text } = cleanCitations("Result turn1file2 shows growth");
    expect(text).not.toContain("turn1file2");
  });

  it("leaves plain markdown untouched", () => {
    const input = "# Title\n\nJust **prose** with [a link](https://x).";
    expect(cleanCitations(input).text).toBe(input);
    expect(cleanCitations(input).citationIds).toEqual([]);
  });
});
