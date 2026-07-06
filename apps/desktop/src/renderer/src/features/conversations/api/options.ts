import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
} from "@tanstack/react-query";
import {
  fetchConversationsPage,
  fetchPinnedConversations,
} from "./conversations";
import { conversationKeys } from "./keys";

/**
 * Shared between route loaders (ensure*QueryData) and hooks so both use one
 * definition of key + fetcher + caching behavior.
 */
export function conversationListInfiniteOptions(search: string) {
  return infiniteQueryOptions({
    queryKey: conversationKeys.list(search),
    queryFn: ({ pageParam }) =>
      fetchConversationsPage({ page: pageParam, search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined,
    // While typing a new search term, keep showing the previous results
    // instead of flashing to a loading state.
    placeholderData: keepPreviousData,
  });
}

export function pinnedConversationsOptions() {
  return queryOptions({
    queryKey: conversationKeys.pinned(),
    queryFn: fetchPinnedConversations,
  });
}
