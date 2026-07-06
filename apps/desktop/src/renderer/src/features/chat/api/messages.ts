import {
  type ChatMessage,
  type MessageFeedback,
  messageHistoryResponseSchema,
  type Paginated,
} from "@myvng/shared";
import { apiGet, apiPost } from "@renderer/shared/lib/api-client";
import { z } from "zod";

export const MESSAGES_PAGE_SIZE = 20;

/** Pages are newest-first: page 1 = latest messages. */
export async function fetchMessagesPage(
  conversationId: string,
  page: number,
): Promise<Paginated<ChatMessage>> {
  const response = await apiGet(
    `/v2/api/conversations/${encodeURIComponent(conversationId)}`,
    messageHistoryResponseSchema,
    { searchParams: { page, size: MESSAGES_PAGE_SIZE } },
  );
  return response.data;
}

export async function submitMessageFeedback(options: {
  messageId: string;
  rating: MessageFeedback;
  feedback?: string;
}): Promise<void> {
  await apiPost(
    "/v2/api/feedback",
    {
      messageId: options.messageId,
      rating: options.rating,
      ...(options.feedback === undefined ? {} : { feedback: options.feedback }),
    },
    z.unknown(),
  );
}
