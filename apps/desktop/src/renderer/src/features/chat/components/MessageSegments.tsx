import { memo, useMemo } from "react";
import { cleanCitations } from "../lib/clean-citations";
import { parseSegments } from "../lib/parse-segments";
import { MessageMarkdown } from "./MessageMarkdown";
import { WidgetRenderer } from "./widgets/WidgetRenderer";

/**
 * Assistant content pipeline: citation cleanup → segment split → prose
 * (memoized markdown) or widget (registry) per segment. Completed messages
 * parse once (memo on `text`); the streaming bubble re-parses per paint but
 * only its final prose block re-renders (see MessageMarkdown).
 */
export const MessageSegments = memo(function MessageSegments({
  text,
  isLastMessage,
}: {
  text: string;
  isLastMessage: boolean;
}): React.JSX.Element {
  const segments = useMemo(
    () => parseSegments(cleanCitations(text).text),
    [text],
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {segments.map((segment, index) => {
        const key = `${index}:${segment.kind}`;
        if (segment.kind === "prose") {
          return <MessageMarkdown key={key} text={segment.text} />;
        }
        if (segment.kind === "widget") {
          return (
            <WidgetRenderer
              key={key}
              segment={segment}
              isLastMessage={isLastMessage}
            />
          );
        }
        return null; // invalid-widget: render nothing, never crash
      })}
    </div>
  );
});
