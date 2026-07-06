import { Input, Spinner } from "@chakra-ui/react";
import type { Conversation } from "@myvng/shared";
import { useDebouncedValue } from "@renderer/shared/hooks/useDebouncedValue";
import { useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConversationActions } from "../hooks/useConversationActions";
import { useConversationsInfinite } from "../hooks/useConversationsInfinite";
import { usePinnedConversations } from "../hooks/usePinnedConversations";
import { ConversationItem } from "./ConversationItem";
import { DeleteConversationDialog } from "./DeleteConversationDialog";
import { RenameConversationDialog } from "./RenameConversationDialog";

const FLASH_DURATION_MS = 2000;
const SEARCH_DEBOUNCE_MS = 300;

export function ConversationSidebarList({
  onItemHover,
}: {
  /** e.g. prefetch the conversation's first message page on hover. */
  onItemHover?: (id: string) => void;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const activeConversationId = params.conversationId;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const pinnedQuery = usePinnedConversations();
  const listQuery = useConversationsInfinite(debouncedSearch);

  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { pinMutation, renameMutation, deleteMutation } =
    useConversationActions({
      onPinToggled: (id) => {
        clearTimeout(flashTimer.current);
        setFlashId(id);
        flashTimer.current = setTimeout(
          () => setFlashId(null),
          FLASH_DURATION_MS,
        );
        // Bring the moved row into view once the lists have re-rendered.
        requestAnimationFrame(() => {
          document
            .querySelector(`[data-conversation-id="${CSS.escape(id)}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      },
      onDeleted: (id) => {
        if (id === activeConversationId) {
          void navigate({ to: "/chat" });
        }
      },
    });

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // Load more when the bottom sentinel becomes visible.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = listQuery;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && hasNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage]);

  const pinnedItems = pinnedQuery.data ?? [];
  const pinnedIds = new Set(pinnedItems.map((item) => item.id));
  const recentItems = (listQuery.data ?? []).filter(
    (item) => !pinnedIds.has(item.id),
  );

  const renderItem = (
    conversation: Conversation,
    isPinnedSection: boolean,
  ): React.JSX.Element => (
    <m.li key={conversation.id} layout="position">
      <ConversationItem
        conversation={conversation}
        isActive={conversation.id === activeConversationId}
        isPinnedSection={isPinnedSection}
        isFlashing={conversation.id === flashId}
        onHover={onItemHover}
        onPinToggle={(target) =>
          pinMutation.mutate({ id: target.id, pinned: isPinnedSection })
        }
        onRename={setRenameTarget}
        onDelete={setDeleteTarget}
      />
    </m.li>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="px-2">
        <Input
          size="sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("sidebar.searchConversationsPlaceholder")}
          aria-label={t("sidebar.searchConversationsPlaceholder")}
        />
      </div>

      <nav
        aria-label={t("sidebar.conversations")}
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
      >
        {pinnedItems.length > 0 ? (
          <section aria-label={t("sidebar.pinned")}>
            <h2 className="px-3 pt-2 pb-1 text-xs font-medium text-text-faint">
              {t("sidebar.pinned")}
            </h2>
            <ul className="flex flex-col gap-0.5">
              <AnimatePresence initial={false}>
                {pinnedItems.map((conversation) =>
                  renderItem(conversation, true),
                )}
              </AnimatePresence>
            </ul>
          </section>
        ) : null}

        <section aria-label={t("sidebar.recents")}>
          <h2 className="px-3 pt-2 pb-1 text-xs font-medium text-text-faint">
            {t("sidebar.recents")}
          </h2>
          {listQuery.isPending ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" aria-label={t("sidebar.conversations")} />
            </div>
          ) : listQuery.isError ? (
            <p role="alert" className="px-3 py-2 text-sm text-danger">
              {t("sidebar.noConversationsFound")}
            </p>
          ) : recentItems.length === 0 ? (
            <p className="px-3 py-2 text-sm text-text-faint">
              {t("sidebar.noConversationsFound")}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              <AnimatePresence initial={false}>
                {recentItems.map((conversation) =>
                  renderItem(conversation, false),
                )}
              </AnimatePresence>
            </ul>
          )}
          <div ref={sentinelRef} className="h-px" aria-hidden />
          {isFetchingNextPage ? (
            <div className="flex justify-center py-2">
              <Spinner size="xs" aria-label={t("sidebar.conversations")} />
            </div>
          ) : null}
        </section>
      </nav>

      <RenameConversationDialog
        conversation={renameTarget}
        onClose={() => setRenameTarget(null)}
        onRename={(id, name) => renameMutation.mutate({ id, name })}
      />
      <DeleteConversationDialog
        conversation={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={(id) => deleteMutation.mutate({ id })}
      />
    </div>
  );
}
