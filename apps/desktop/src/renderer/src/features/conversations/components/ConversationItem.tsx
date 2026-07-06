import { IconButton, Menu, Portal } from "@chakra-ui/react";
import type { Conversation } from "@myvng/shared";
import { Link } from "@tanstack/react-router";
import { MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export type ConversationItemProps = {
  conversation: Conversation;
  isActive: boolean;
  isPinnedSection: boolean;
  isFlashing: boolean;
  onHover?: (id: string) => void;
  onPinToggle: (conversation: Conversation) => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
};

export function ConversationItem({
  conversation,
  isActive,
  isPinnedSection,
  isFlashing,
  onHover,
  onPinToggle,
  onRename,
  onDelete,
}: ConversationItemProps): React.JSX.Element {
  const { t } = useTranslation("aiAgents");

  return (
    <div
      className={`group relative flex items-center rounded-md ${
        isActive ? "bg-surface-200" : "hover:bg-surface-100"
      } ${isFlashing ? "conversation-flash" : ""}`}
      data-conversation-id={conversation.id}
    >
      <Link
        to="/chat/$conversationId"
        params={{ conversationId: conversation.id }}
        className="min-w-0 flex-1 truncate px-3 py-2 text-sm"
        title={conversation.name}
        onMouseEnter={() => onHover?.(conversation.id)}
      >
        {conversation.name}
      </Link>
      <Menu.Root positioning={{ placement: "bottom-end" }}>
        <Menu.Trigger asChild>
          <IconButton
            aria-label={t("sidebar.conversationActions")}
            size="xs"
            variant="ghost"
            color="textMuted"
            className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal size={16} />
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item value="pin" onSelect={() => onPinToggle(conversation)}>
                {isPinnedSection ? <PinOff size={14} /> : <Pin size={14} />}
                {isPinnedSection ? t("sidebar.unpin") : t("sidebar.pin")}
              </Menu.Item>
              <Menu.Item value="rename" onSelect={() => onRename(conversation)}>
                <Pencil size={14} />
                {t("sidebar.renameConversation")}
              </Menu.Item>
              <Menu.Item
                value="delete"
                color="danger"
                onSelect={() => onDelete(conversation)}
              >
                <Trash2 size={14} />
                {t("sidebar.deleteConversationTitle")}
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </div>
  );
}
