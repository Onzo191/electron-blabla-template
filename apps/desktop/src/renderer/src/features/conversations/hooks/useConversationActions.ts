import type { Conversation, Paginated } from "@myvng/shared";
import { toaster } from "@renderer/shared/components/toaster";
import {
  type InfiniteData,
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  deleteConversation,
  pinConversation,
  renameConversation,
  unpinConversation,
} from "../api/conversations";
import { conversationKeys } from "../api/keys";

type ConversationListData = InfiniteData<Paginated<Conversation>, number>;

function patchConversationCaches(
  queryClient: QueryClient,
  id: string,
  patch: Partial<Conversation>,
): void {
  queryClient.setQueriesData<ConversationListData>(
    { queryKey: conversationKeys.lists() },
    (old) =>
      old === undefined
        ? old
        : {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === id ? { ...item, ...patch } : item,
              ),
            })),
          },
  );
  queryClient.setQueryData<Conversation[]>(conversationKeys.pinned(), (old) =>
    old?.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  );
}

function removeConversationFromCaches(
  queryClient: QueryClient,
  id: string,
): void {
  queryClient.setQueriesData<ConversationListData>(
    { queryKey: conversationKeys.lists() },
    (old) =>
      old === undefined
        ? old
        : {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== id),
            })),
          },
  );
  queryClient.setQueryData<Conversation[]>(conversationKeys.pinned(), (old) =>
    old?.filter((item) => item.id !== id),
  );
}

async function snapshotConversationCaches(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: conversationKeys.all });
  return {
    lists: queryClient.getQueriesData<ConversationListData>({
      queryKey: conversationKeys.lists(),
    }),
    pinned: queryClient.getQueryData<Conversation[]>(conversationKeys.pinned()),
  };
}

type CacheSnapshot = Awaited<ReturnType<typeof snapshotConversationCaches>>;

function restoreConversationCaches(
  queryClient: QueryClient,
  snapshot: CacheSnapshot,
): void {
  for (const [key, data] of snapshot.lists) {
    queryClient.setQueryData(key, data);
  }
  queryClient.setQueryData(conversationKeys.pinned(), snapshot.pinned);
}

/**
 * Pin/unpin/rename/delete with optimistic cache updates, rollback on error
 * (with a toast), and list invalidation on settle.
 */
export function useConversationActions(options?: {
  /** Called after a successful pin/unpin, e.g. to flash-highlight the row. */
  onPinToggled?: (id: string, pinned: boolean) => void;
  /** Called after a successful delete (e.g. navigate away if it was active). */
  onDeleted?: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation("aiAgents");

  const invalidateLists = (): void => {
    void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
  };

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      pinned ? unpinConversation(id) : pinConversation(id),
    onMutate: async ({ id, pinned }) => {
      const snapshot = await snapshotConversationCaches(queryClient);
      patchConversationCaches(queryClient, id, { pinned: !pinned });
      return snapshot;
    },
    onError: (_error, { pinned }, snapshot) => {
      if (snapshot) restoreConversationCaches(queryClient, snapshot);
      toaster.error({
        title: pinned
          ? t("sidebar.failedToUnpinConversation")
          : t("sidebar.failedToPinConversation"),
      });
    },
    onSuccess: (_data, { id, pinned }) => {
      options?.onPinToggled?.(id, !pinned);
    },
    onSettled: invalidateLists,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameConversation(id, name),
    onMutate: async ({ id, name }) => {
      const snapshot = await snapshotConversationCaches(queryClient);
      patchConversationCaches(queryClient, id, { name });
      return snapshot;
    },
    onError: (_error, _variables, snapshot) => {
      if (snapshot) restoreConversationCaches(queryClient, snapshot);
      toaster.error({ title: t("sidebar.failedToRenameConversation") });
    },
    onSettled: invalidateLists,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteConversation(id),
    onMutate: async ({ id }) => {
      const snapshot = await snapshotConversationCaches(queryClient);
      removeConversationFromCaches(queryClient, id);
      return snapshot;
    },
    onError: (_error, _variables, snapshot) => {
      if (snapshot) restoreConversationCaches(queryClient, snapshot);
      toaster.error({ title: t("sidebar.failedToDeleteConversation") });
    },
    onSuccess: (_data, { id }) => {
      toaster.success({ title: t("sidebar.conversationDeleted") });
      options?.onDeleted?.(id);
    },
    onSettled: invalidateLists,
  });

  return { pinMutation, renameMutation, deleteMutation };
}
