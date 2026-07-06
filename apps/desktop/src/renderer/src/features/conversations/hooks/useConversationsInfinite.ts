import { useInfiniteQuery } from "@tanstack/react-query";
import { conversationListInfiniteOptions } from "../api/options";

/** Flattened, scroll-to-load conversation list filtered by `search`. */
export function useConversationsInfinite(search: string) {
  return useInfiniteQuery({
    ...conversationListInfiniteOptions(search),
    select: (data) => data.pages.flatMap((page) => page.items),
  });
}
