import { Button, Dialog, Portal } from "@chakra-ui/react";
import type { Conversation } from "@myvng/shared";
import { useTranslation } from "react-i18next";

export function DeleteConversationDialog({
  conversation,
  onClose,
  onDelete,
}: {
  /** The conversation pending deletion; null keeps the dialog closed. */
  conversation: Conversation | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");

  return (
    <Dialog.Root
      role="alertdialog"
      open={conversation !== null}
      onOpenChange={({ open }) => {
        if (!open) onClose();
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {t("sidebar.deleteConversationTitle")}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p className="text-sm text-text-muted">
                {t("sidebar.deleteConversationDesc")}
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">{t("common.cancel")}</Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                onClick={() => {
                  if (conversation !== null) onDelete(conversation.id);
                  onClose();
                }}
              >
                {t("common.delete")}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
