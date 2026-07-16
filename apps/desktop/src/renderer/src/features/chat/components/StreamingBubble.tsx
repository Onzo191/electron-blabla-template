import { DURATION } from "@renderer/shared/lib/motion";
import { useAppStore } from "@renderer/store/useAppStore";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { MessageError } from "./MessageError";
import { MessageSegments } from "./MessageSegments";
import { ReasoningAccordion } from "./ReasoningAccordion";
import { ToolStatusIndicator } from "./ToolStatusIndicator";
import { TypingDots } from "./TypingDots";

/**
 * The in-flight exchange, rendered entirely from the chat slice (ADR 4).
 * Mounted only while a stream is active for the visible conversation; the
 * completed exchange re-renders from the Query cache after write-back.
 */
export function StreamingBubble(): React.JSX.Element | null {
  const { t } = useTranslation("aiAgents");
  const streamStatus = useAppStore((state) => state.streamStatus);
  const pendingUserMessage = useAppStore((state) => state.pendingUserMessage);
  const streamedText = useAppStore((state) => state.streamedText);
  const reasoningText = useAppStore((state) => state.reasoningText);
  const toolStatus = useAppStore((state) => state.toolStatus);
  const streamError = useAppStore((state) => state.streamError);
  const retryLastAsk = useAppStore((state) => state.retryLastAsk);

  if (streamStatus === "idle") return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.normal }}
      className="flex flex-col gap-3"
    >
      {pendingUserMessage ? (
        <div className="flex justify-end">
          <div className="max-w-[61.8%] whitespace-pre-wrap rounded-xl bg-bubble-user px-4 py-2.5 text-md text-bubble-user-text">
            {pendingUserMessage.content}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {reasoningText !== "" ? (
          <ReasoningAccordion text={reasoningText} defaultOpen />
        ) : null}

        {toolStatus ? (
          <ToolStatusIndicator
            label={
              toolStatus.label === ""
                ? t("chatbot:chat.textWaiting")
                : toolStatus.label
            }
          />
        ) : null}

        {streamedText !== "" ? (
          <div className="relative">
            <MessageSegments text={streamedText} isLastMessage={false} />
            {streamStatus === "streaming" ? (
              <span
                aria-hidden
                className="animate-chat-cursor ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-text-muted"
              />
            ) : null}
          </div>
        ) : streamStatus === "connecting" ? (
          <TypingDots label={t("chatbot:loading-reply.holdOn")} />
        ) : null}

        {streamStatus === "error" && streamError ? (
          <MessageError error={streamError} onRetry={retryLastAsk} />
        ) : null}
      </div>
    </m.div>
  );
}
