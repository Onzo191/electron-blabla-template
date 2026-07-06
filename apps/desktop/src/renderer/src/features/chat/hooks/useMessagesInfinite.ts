import { useInfiniteQuery } from "@tanstack/react-query";
import { messagesInfiniteOptions } from "../api/options";

/**
 * Conversation history flattened oldest → newest for rendering.
 * Pages arrive newest-first (page 1 = latest), so both the page order and
 * the items within each page are reversed.
 */
export function useMessagesInfinite(conversationId: string) {
  return useInfiniteQuery({
    ...messagesInfiniteOptions(conversationId),
    select: (data) =>
      [...data.pages].reverse().flatMap((page) => [...page.items].reverse()),
  });
}
