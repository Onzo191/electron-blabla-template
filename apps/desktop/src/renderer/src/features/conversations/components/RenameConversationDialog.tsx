import { Button, Dialog, Input, Portal } from "@chakra-ui/react";
import type { Conversation } from "@myvng/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function RenameConversationDialog({
  conversation,
  onClose,
  onRename,
}: {
  /** The conversation being renamed; null keeps the dialog closed. */
  conversation: Conversation | null;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const [name, setName] = useState("");

  useEffect(() => {
    setName(conversation?.name ?? "");
  }, [conversation]);

  const submit = (): void => {
    const trimmed = name.trim();
    if (conversation === null || trimmed === "") return;
    onRename(conversation.id, trimmed);
    onClose();
  };

  return (
    <Dialog.Root
      open={conversation !== null}
      onOpenChange={({ open }) => {
        if (!open) onClose();
      }}
      initialFocusEl={undefined}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{t("sidebar.renameConversation")}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("sidebar.renamePlaceholder")}
                aria-label={t("sidebar.renameConversation")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
              />
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">{t("common.cancel")}</Button>
              </Dialog.ActionTrigger>
              <Button onClick={submit} disabled={name.trim() === ""}>
                {t("sidebar.renameConversation")}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
