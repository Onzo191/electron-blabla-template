import { type Conversation, conversationsResponseSchema } from "@myvng/shared";
import { apiGet } from "@renderer/shared/lib/api-client";

export function fetchConversations(): Promise<Conversation[]> {
  return apiGet("/conversations", conversationsResponseSchema);
}
