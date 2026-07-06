import { describe, expect, it } from "vitest";
import { parseSegments } from "./parse-segments";

describe("parseSegments", () => {
  it("returns a single prose segment for plain markdown", () => {
    expect(parseSegments("Hello **world**")).toEqual([
      { kind: "prose", text: "Hello **world**" },
    ]);
  });

  it("extracts a widget block between prose", () => {
    const markdown = [
      "Here are your options:",
      "====SUGGESTIONS====",
      '{"items":["Ask about parking","Ask about insurance"]}',
      "====END_SUGGESTIONS====",
      "Anything else?",
    ].join("\n");

    const segments = parseSegments(markdown);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({
      kind: "prose",
      text: "Here are your options:",
    });
    expect(segments[1]).toMatchObject({
      kind: "widget",
      block: {
        type: "suggestions",
        payload: { items: ["Ask about parking", "Ask about insurance"] },
      },
    });
    expect(segments[2]).toEqual({ kind: "prose", text: "Anything else?" });
  });

  it("parses every marker type", () => {
    const markdown = [
      "====MEDIA====",
      '{"items":[{"url":"https://x/a.png","mediaType":"image"}]}',
      "====END_MEDIA====",
      "====SUPPORT_CONTACT====",
      '{"items":[{"name":"Helpdesk"}]}',
      "====END_SUPPORT_CONTACT====",
      "====REFERENCES====",
      '{"items":[{"title":"Doc","url":"https://x"}]}',
      "====END_REFERENCES====",
      "====ATTACHMENTS====",
      '{"items":[{"name":"f.xlsx","url":"https://x/f.xlsx"}]}',
      "====END_ATTACHMENTS====",
      "====EXPORT_ARTIFACT====",
      '{"attachmentId":"a1","fileName":"report.pdf"}',
      "====END_EXPORT_ARTIFACT====",
      "====EXPORT_FORMAT_PICKER====",
      '{"availableFormats":["pdf","docx"]}',
      "====END_EXPORT_FORMAT_PICKER====",
      "====ASK_COLLEAGUES_TOOL====",
      '{"data":{"name":"Jane Doe"}}',
      "====END_ASK_COLLEAGUES_TOOL====",
      "====CLOSING====",
      '{"text":"Take care!"}',
      "====END_CLOSING====",
    ].join("\n");

    const kinds = parseSegments(markdown).map((segment) =>
      segment.kind === "widget" ? segment.block.type : segment.kind,
    );
    expect(kinds).toEqual([
      "media",
      "support_contact",
      "references",
      "attachments",
      "export_artifact",
      "export_format_picker",
      "ask_colleagues",
      "closing",
    ]);
  });

  it("treats a plain-text CLOSING body as its text payload", () => {
    const segments = parseSegments(
      "====CLOSING====\nStay safe out there.\n====END_CLOSING====",
    );
    expect(segments[0]).toMatchObject({
      kind: "widget",
      block: { type: "closing", payload: { text: "Stay safe out there." } },
    });
  });

  it("flags malformed widget JSON as invalid without crashing", () => {
    const segments = parseSegments(
      "before\n====MEDIA====\n{not json}\n====END_MEDIA====\nafter",
    );
    expect(segments[1]).toEqual({ kind: "invalid-widget", marker: "MEDIA" });
    expect(segments[0]).toEqual({ kind: "prose", text: "before" });
    expect(segments[2]).toEqual({ kind: "prose", text: "after" });
  });

  it("withholds an unterminated block while streaming", () => {
    const segments = parseSegments(
      'Some prose\n====SUGGESTIONS====\n{"items":["partial',
    );
    expect(segments).toEqual([{ kind: "prose", text: "Some prose" }]);
  });
});
