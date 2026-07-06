import type { ChatMessage, MessageFeedback, Paginated } from "@myvng/shared";
import { queryClient } from "@renderer/app/queryClient";
import type { InfiniteData } from "@tanstack/react-query";
import { conversationKeys } from "../../conversations/api/keys";
import { chatKeys } from "./keys";
import { MESSAGES_PAGE_SIZE } from "./messages";

type MessagesPage = Paginated<ChatMessage>;
type MessagesData = InfiniteData<MessagesPage, number>;

function emptyPage(): MessagesPage {
  return {
    items: [],
    pagination: {
      page: 1,
      size: MESSAGES_PAGE_SIZE,
      total: 0,
      hasNextPage: false,
    },
  };
}

/**
 * Seeds an empty first page for a brand-new conversation so the detail route
 * mounts with fresh cache data (staleTime: Infinity) instead of refetching
 * a conversation the backend may not fully expose yet.
 */
export function seedNewConversation(conversationId: string): void {
  queryClient.setQueryData<MessagesData>(
    chatKeys.messages(conversationId),
    (old) => old ?? { pageParams: [1], pages: [emptyPage()] },
  );
}

/**
 * Writes a completed user/assistant exchange to the front of page 1
 * (pages are newest-first) once a stream finishes.
 */
export function writeCompletedExchange(
  conversationId: string,
  userMessage: ChatMessage,
  botMessage: ChatMessage,
): void {
  const newestFirst = [botMessage, userMessage];
  queryClient.setQueryData<MessagesData>(
    chatKeys.messages(conversationId),
    (old) => {
      const first = old?.pages[0];
      if (!old || first === undefined) {
        return {
          pageParams: [1],
          pages: [{ ...emptyPage(), items: newestFirst }],
        };
      }
      return {
        ...old,
        pages: [
          { ...first, items: [...newestFirst, ...first.items] },
          ...old.pages.slice(1),
        ],
      };
    },
  );
}

/** Targeted patch after rating a message — no refetch needed. */
export function patchMessageFeedback(
  conversationId: string,
  messageId: string,
  feedback: MessageFeedback,
): void {
  queryClient.setQueryData<MessagesData>(
    chatKeys.messages(conversationId),
    (old) =>
      old === undefined
        ? old
        : {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === messageId ? { ...item, feedback } : item,
              ),
            })),
          },
  );
}

/** Sidebar lists change order/content after any completed exchange. */
export function invalidateConversationLists(): void {
  void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
}

export function removeConversationMessages(conversationId: string): void {
  queryClient.removeQueries({ queryKey: chatKeys.messages(conversationId) });
}
