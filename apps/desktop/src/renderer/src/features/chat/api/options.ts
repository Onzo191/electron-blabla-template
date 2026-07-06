import { infiniteQueryOptions } from "@tanstack/react-query";
import { chatKeys } from "./keys";
import { fetchMessagesPage } from "./messages";

const MESSAGES_GC_TIME_MS = 10 * 60_000;

/**
 * Message history is append-only from the client's perspective: new messages
 * arrive via the stream write-back (never a refetch), so pages are fresh
 * forever. `fetchNextPage` walks backwards in time (page 1 = newest).
 */
export function messagesInfiniteOptions(conversationId: string) {
  return infiniteQueryOptions({
    queryKey: chatKeys.messages(conversationId),
    queryFn: ({ pageParam }) => fetchMessagesPage(conversationId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: MESSAGES_GC_TIME_MS,
  });
}
