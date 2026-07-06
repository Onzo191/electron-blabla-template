import {
  WIDGET_MARKERS,
  type WidgetBlock,
  type WidgetMarker,
  widgetBlockSchema,
} from "@myvng/shared";

export type ChatSegment =
  | { kind: "prose"; text: string }
  | { kind: "widget"; block: WidgetBlock }
  /** Recognized marker whose payload failed JSON/schema parsing — render nothing. */
  | { kind: "invalid-widget"; marker: WidgetMarker };

const MARKER_NAMES = Object.keys(WIDGET_MARKERS) as WidgetMarker[];
const MARKER_ALTERNATION = MARKER_NAMES.join("|");

/** Complete `====X==== body ====END_X====` blocks. */
const BLOCK_REGEX = new RegExp(
  `====(${MARKER_ALTERNATION})====\\s*([\\s\\S]*?)\\s*====END_\\1====`,
  "g",
);

/** An opening marker whose END has not streamed in yet. */
const OPEN_MARKER_REGEX = new RegExp(`====(?:${MARKER_ALTERNATION})====`);

function parseWidget(marker: WidgetMarker, body: string): ChatSegment {
  const type = WIDGET_MARKERS[marker];
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    // The CLOSING block is allowed to be plain text instead of JSON.
    if (type === "closing") {
      return {
        kind: "widget",
        block: { type: "closing", payload: { text: body } },
      };
    }
    return { kind: "invalid-widget", marker };
  }
  if (type === "closing" && typeof payload === "string") {
    payload = { text: payload };
  }
  const parsed = widgetBlockSchema.safeParse({ type, payload });
  return parsed.success
    ? { kind: "widget", block: parsed.data }
    : { kind: "invalid-widget", marker };
}

/**
 * Splits assistant markdown into prose and structured widget segments.
 * A trailing block whose closing marker hasn't arrived yet (mid-stream) is
 * withheld entirely — widgets never render from partial JSON.
 */
export function parseSegments(markdown: string): ChatSegment[] {
  const segments: ChatSegment[] = [];

  const pushProse = (raw: string): void => {
    const text = raw.trim();
    if (text !== "") segments.push({ kind: "prose", text });
  };

  let lastIndex = 0;
  BLOCK_REGEX.lastIndex = 0;
  for (
    let match = BLOCK_REGEX.exec(markdown);
    match !== null;
    match = BLOCK_REGEX.exec(markdown)
  ) {
    pushProse(markdown.slice(lastIndex, match.index));
    segments.push(parseWidget(match[1] as WidgetMarker, match[2] ?? ""));
    lastIndex = BLOCK_REGEX.lastIndex;
  }

  const tail = markdown.slice(lastIndex);
  const openMarker = OPEN_MARKER_REGEX.exec(tail);
  if (openMarker) {
    // Everything before the unfinished block is normal prose.
    pushProse(tail.slice(0, openMarker.index));
  } else {
    pushProse(tail);
  }

  return segments;
}
