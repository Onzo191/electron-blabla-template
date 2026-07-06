import { useAppStore } from "@renderer/store/useAppStore";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * When a new-conversation stream receives its `conversation` SSE event, the
 * slice seeds the messages cache and sets a pending redirect; this component
 * (mounted once in the chat layout) performs the navigation. The stream is
 * slice-owned, so the route transition never interrupts it.
 */
export function ChatStreamRedirector(): null {
  const pendingId = useAppStore((state) => state.pendingRedirectConversationId);
  const consumeRedirect = useAppStore((state) => state.consumeRedirect);
  const navigate = useNavigate();

  useEffect(() => {
    if (pendingId === null) return;
    consumeRedirect();
    void navigate({
      to: "/chat/$conversationId",
      params: { conversationId: pendingId },
    });
  }, [pendingId, consumeRedirect, navigate]);

  return null;
}
