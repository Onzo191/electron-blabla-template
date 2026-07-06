import type { ChatMessage } from "@myvng/shared";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { MessageSegments } from "./MessageSegments";
import { RatingActions } from "./RatingActions";
import { ReasoningAccordion } from "./ReasoningAccordion";

/**
 * A persisted message. User messages are right-aligned tinted bubbles;
 * assistant messages are full-width borderless prose (widgets are the
 * visual events) with reasoning, rating, and response-time footer.
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  conversationId,
  isLastMessage,
}: {
  message: ChatMessage;
  conversationId: string;
  isLastMessage: boolean;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[65ch] whitespace-pre-wrap rounded-xl bg-bubble-user px-4 py-2.5 text-[15px] text-bubble-user-text">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {message.reasoning ? (
        <ReasoningAccordion text={message.reasoning} />
      ) : null}
      <MessageSegments text={message.content} isLastMessage={isLastMessage} />
      <div className="flex items-center gap-3">
        <RatingActions message={message} conversationId={conversationId} />
        {message.responseTime != null ? (
          <span className="text-xs text-text-faint">
            {t("message.responseTime", {
              value1: message.responseTime.toFixed(1),
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
});
