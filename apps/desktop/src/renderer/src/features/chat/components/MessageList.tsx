import { Skeleton } from "@chakra-ui/react";
import { useAppStore } from "@renderer/store/useAppStore";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { useMessagesInfinite } from "../hooks/useMessagesInfinite";
import { MessageBubble } from "./MessageBubble";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { StreamingBubble } from "./StreamingBubble";

function HistorySkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex justify-end">
        <Skeleton height="10" width="60%" borderRadius="xl" />
      </div>
      <Skeleton height="24" width="90%" borderRadius="lg" />
      <div className="flex justify-end">
        <Skeleton height="10" width="40%" borderRadius="xl" />
      </div>
      <Skeleton height="16" width="80%" borderRadius="lg" />
    </div>
  );
}

export function MessageList({
  conversationId,
}: {
  conversationId: string;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef<number | null>(null);

  const messagesQuery = useMessagesInfinite(conversationId);
  const messages = messagesQuery.data ?? [];
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = messagesQuery;

  const streamStatus = useAppStore((state) => state.streamStatus);
  const activeConversationId = useAppStore(
    (state) => state.activeConversationId,
  );
  const streamedTextLength = useAppStore((state) => state.streamedText.length);
  const streamHere =
    streamStatus !== "idle" && activeConversationId === conversationId;

  const { onScroll, scrollToBottom, showScrollButton } = useAutoScroll(
    containerRef,
    // grows on new messages and on every streamed paint
    messages.length * 1_000_000 + (streamHere ? streamedTextLength : 0),
  );

  // Jump to the bottom when opening a conversation.
  // biome-ignore lint/correctness/useExhaustiveDependencies(conversationId): re-run on conversation switch
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [conversationId]);

  // Load older pages when the top sentinel is visible; record the scroll
  // height first so the reading position can be restored after prepend.
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver((entries) => {
      if (
        entries.some((entry) => entry.isIntersecting) &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        prevScrollHeightRef.current = container.scrollHeight;
        void fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Layout-shift prevention (spec §3D): keep the viewport anchored to the
  // same message after older pages are injected above.
  // biome-ignore lint/correctness/useExhaustiveDependencies(messages.length): runs when the prepend has rendered
  useLayoutEffect(() => {
    const container = containerRef.current;
    const previous = prevScrollHeightRef.current;
    if (!container || previous === null) return;
    prevScrollHeightRef.current = null;
    container.scrollTop += container.scrollHeight - previous;
  }, [messages.length]);

  const announcement =
    streamStatus === "connecting" || streamStatus === "streaming"
      ? t("chatbot:loading-reply.holdOn")
      : streamStatus === "error"
        ? t("message.error")
        : "";

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        onScroll={onScroll}
        role="log"
        aria-label={t("sidebar.conversations")}
        className="h-full overflow-y-auto px-4"
      >
        <div className="mx-auto flex max-w-content flex-col gap-6 py-4">
          <div ref={topSentinelRef} className="h-px" aria-hidden />
          {isFetchingNextPage ? (
            <Skeleton height="10" width="70%" borderRadius="lg" />
          ) : null}
          {messagesQuery.isPending ? (
            <HistorySkeleton />
          ) : (
            messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                conversationId={conversationId}
                isLastMessage={index === messages.length - 1 && !streamHere}
              />
            ))
          )}
          {streamHere ? <StreamingBubble /> : null}
        </div>
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>

      <ScrollToBottomButton
        visible={showScrollButton}
        isStreaming={streamHere && streamStatus === "streaming"}
        onClick={() => scrollToBottom()}
      />
    </div>
  );
}
