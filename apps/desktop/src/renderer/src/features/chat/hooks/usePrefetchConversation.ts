import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { messagesInfiniteOptions } from "../api/options";

/** Warms a conversation's first message page (e.g. on sidebar hover). */
export function usePrefetchConversation() {
  const queryClient = useQueryClient();
  return useCallback(
    (conversationId: string) => {
      void queryClient.prefetchInfiniteQuery({
        ...messagesInfiniteOptions(conversationId),
        pages: 1,
      });
    },
    [queryClient],
  );
}
