import { useQuery } from "@tanstack/react-query";
import { pinnedConversationsOptions } from "../api/options";

export function usePinnedConversations() {
  return useQuery(pinnedConversationsOptions());
}
