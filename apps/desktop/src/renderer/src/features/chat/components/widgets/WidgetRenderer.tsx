import type { WidgetBlock } from "@myvng/shared";
import { ErrorBoundary } from "@renderer/shared/components/ErrorBoundary";
import type { ChatSegment } from "../../lib/parse-segments";
import { AttachmentRows } from "./AttachmentRows";
import { ClosingNote } from "./ClosingNote";
import { ColleagueCard } from "./ColleagueCard";
import { ExportArtifactCard } from "./ExportArtifactCard";
import { ExportFormatPicker } from "./ExportFormatPicker";
import { MediaGrid } from "./MediaGrid";
import { ReferencesList } from "./ReferencesList";
import { SuggestionChips } from "./SuggestionChips";
import { SupportContactCards } from "./SupportContactCards";

function WidgetBody({
  block,
  isLastMessage,
}: {
  block: WidgetBlock;
  isLastMessage: boolean;
}): React.JSX.Element | null {
  switch (block.type) {
    case "media":
      return <MediaGrid payload={block.payload} />;
    case "suggestions":
      return (
        <SuggestionChips
          payload={block.payload}
          isLastMessage={isLastMessage}
        />
      );
    case "support_contact":
      return <SupportContactCards payload={block.payload} />;
    case "references":
      return <ReferencesList payload={block.payload} />;
    case "closing":
      return <ClosingNote payload={block.payload} />;
    case "attachments":
      return <AttachmentRows payload={block.payload} />;
    case "export_artifact":
      return <ExportArtifactCard payload={block.payload} />;
    case "export_format_picker":
      return (
        <ExportFormatPicker
          payload={block.payload}
          isLastMessage={isLastMessage}
        />
      );
    case "ask_colleagues":
      return <ColleagueCard payload={block.payload} />;
  }
}

/**
 * Renders one parsed segment's widget. Each widget gets its own boundary
 * with a null fallback so a single malformed payload can never take down
 * the whole message thread.
 */
export function WidgetRenderer({
  segment,
  isLastMessage,
}: {
  segment: Extract<ChatSegment, { kind: "widget" }>;
  isLastMessage: boolean;
}): React.JSX.Element {
  return (
    <ErrorBoundary fallback={() => null}>
      <WidgetBody block={segment.block} isLastMessage={isLastMessage} />
    </ErrorBoundary>
  );
}
