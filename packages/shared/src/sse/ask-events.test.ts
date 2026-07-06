import { describe, expect, it } from "vitest";
import { parseAskSseLine } from "./ask-events";

describe("parseAskSseLine", () => {
  it("parses the [START] sentinel", () => {
    expect(parseAskSseLine("data: [START]")).toEqual({ kind: "start" });
  });

  it("parses the [DONE] sentinel", () => {
    expect(parseAskSseLine("data: [DONE]")).toEqual({ kind: "done" });
  });

  it("parses a conversation event", () => {
    expect(
      parseAskSseLine(
        'data: {"type":"conversation","id":"conv-1","name":"Insurance"}',
      ),
    ).toEqual({ kind: "conversation", id: "conv-1", name: "Insurance" });
  });

  it("parses a response fragment", () => {
    expect(parseAskSseLine('data: {"response":"Hello "}')).toEqual({
      kind: "response",
      text: "Hello ",
    });
  });

  it("parses a reasoning fragment", () => {
    expect(parseAskSseLine('data: {"reasoning":"Thinking..."}')).toEqual({
      kind: "reasoning",
      text: "Thinking...",
    });
  });

  it("parses a tool status event", () => {
    expect(
      parseAskSseLine(
        'data: {"type":"tool_status","tool":"web_search","label":"Searching..."}',
      ),
    ).toEqual({
      kind: "tool-status",
      tool: "web_search",
      label: "Searching...",
    });
  });

  it("parses message meta with response time", () => {
    expect(
      parseAskSseLine('data: {"messageId":"msg-9","responseTime":0.5}'),
    ).toEqual({ kind: "message-meta", messageId: "msg-9", responseTime: 0.5 });
  });

  it("parses a references event", () => {
    expect(
      parseAskSseLine(
        'data: {"references":[{"title":"Doc","url":"https://x"}]}',
      ),
    ).toEqual({
      kind: "references",
      references: [{ title: "Doc", url: "https://x" }],
    });
  });

  it("parses a mid-stream error event", () => {
    expect(
      parseAskSseLine('data: {"error":"Internal Error","statusCode":500}'),
    ).toEqual({
      kind: "stream-error",
      message: "Internal Error",
      statusCode: 500,
    });
  });

  it("tolerates a missing space after the data prefix", () => {
    expect(parseAskSseLine("data:[DONE]")).toEqual({ kind: "done" });
  });

  it("returns null for blank lines", () => {
    expect(parseAskSseLine("")).toBeNull();
    expect(parseAskSseLine("   ")).toBeNull();
  });

  it("returns null for non-data lines", () => {
    expect(parseAskSseLine("event: message")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseAskSseLine('data: {"response": broken')).toBeNull();
  });

  it("returns null for unrecognized event shapes (forward compatible)", () => {
    expect(parseAskSseLine('data: {"somethingNew":true}')).toBeNull();
  });
});
