import { useQuery } from "@tanstack/react-query";
import { fetchConversations } from "../api/conversations";
import { conversationKeys } from "../api/keys";

export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: fetchConversations,
  });
}
