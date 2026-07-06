import {
  type Conversation,
  conversationInitResponseSchema,
  conversationListResponseSchema,
  type Paginated,
} from "@myvng/shared";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from "@renderer/shared/lib/api-client";
import { z } from "zod";

export const CONVERSATIONS_PAGE_SIZE = 20;
const PINNED_PAGE_SIZE = 20;

const unknownResponseSchema = z.unknown();

export async function fetchConversationsPage(options: {
  page: number;
  search: string;
}): Promise<Paginated<Conversation>> {
  const response = await apiGet(
    "/v2/api/conversations",
    conversationListResponseSchema,
    {
      searchParams: {
        page: options.page,
        size: CONVERSATIONS_PAGE_SIZE,
        search: options.search === "" ? undefined : options.search,
      },
    },
  );
  return response.data;
}

export async function fetchPinnedConversations(): Promise<Conversation[]> {
  const response = await apiGet(
    "/v2/api/conversations/pinned",
    conversationListResponseSchema,
    { searchParams: { page: 1, size: PINNED_PAGE_SIZE } },
  );
  return response.data.items;
}

export async function pinConversation(id: string): Promise<void> {
  await apiPost(
    `/v2/api/conversations/${encodeURIComponent(id)}/pin`,
    undefined,
    unknownResponseSchema,
  );
}

export async function unpinConversation(id: string): Promise<void> {
  await apiDelete(
    `/v2/api/conversations/${encodeURIComponent(id)}/pin`,
    unknownResponseSchema,
  );
}

export async function renameConversation(
  id: string,
  name: string,
): Promise<void> {
  await apiPatch(
    `/v2/api/conversations/${encodeURIComponent(id)}`,
    { name },
    unknownResponseSchema,
  );
}

export async function deleteConversation(id: string): Promise<void> {
  await apiDelete(
    `/v2/api/conversations/${encodeURIComponent(id)}`,
    unknownResponseSchema,
  );
}

export async function initConversation(agentId: string): Promise<string> {
  const response = await apiPost(
    "/v2/api/conversations/init",
    { agentId },
    conversationInitResponseSchema,
  );
  return response.data.id;
}
