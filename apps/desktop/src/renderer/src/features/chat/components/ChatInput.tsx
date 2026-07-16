import { IconButton, Textarea } from "@chakra-ui/react";
import { useOnlineStatus } from "@renderer/shared/hooks/useOnlineStatus";
import { useAppStore } from "@renderer/store/useAppStore";
import { Globe, Send, Square, WifiOff } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * Message composer: autogrow textarea, Enter=send / Shift+Enter=newline
 * (IME-safe), Escape=stop, web-search toggle, Send↔Stop swap while
 * streaming. Drafts persist per conversation in the chat slice.
 */
export function ChatInput({
  draftKey,
  onSend,
}: {
  draftKey: string;
  onSend: (text: string) => void;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const online = useOnlineStatus();

  const draft = useAppStore((state) => state.drafts[draftKey] ?? "");
  const setDraft = useAppStore((state) => state.setDraft);
  const streamStatus = useAppStore((state) => state.streamStatus);
  const cancelStreaming = useAppStore((state) => state.cancelStreaming);
  const webSearchEnabled = useAppStore((state) => state.webSearchEnabled);
  const toggleWebSearch = useAppStore((state) => state.toggleWebSearch);
  const hasAgent = useAppStore((state) => state.selectedAgent !== null);

  const isBusy = streamStatus === "connecting" || streamStatus === "streaming";
  const canSend = !isBusy && hasAgent && draft.trim() !== "";

  const send = (): void => {
    if (!canSend) return;
    onSend(draft.trim());
    setDraft(draftKey, "");
    textareaRef.current?.focus();
  };

  return (
    <div className="mx-auto w-full max-w-content px-4 pb-4">
      {!online ? (
        <p
          role="status"
          className="mb-2 flex items-center gap-2 rounded-md border border-danger/40 px-3 py-1.5 text-xs text-danger"
        >
          <WifiOff size={12} />
          {t("common.offline")}
        </p>
      ) : null}
      <div className="interactive flex items-end gap-2 rounded-xl border border-border-subtle bg-surface-raised p-2 shadow-sm focus-within:border-accent">
        <IconButton
          aria-label={t("chat.webSearch")}
          aria-pressed={webSearchEnabled}
          size="sm"
          variant="ghost"
          color={webSearchEnabled ? "accent" : "textMuted"}
          title={
            webSearchEnabled
              ? t("chat.webSearchChipWebOn")
              : t("chat.webSearchChipKbOnly")
          }
          onClick={toggleWebSearch}
        >
          <Globe size={16} />
        </IconButton>
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(draftKey, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && isBusy) {
              cancelStreaming();
              return;
            }
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={t("chatbot:chat.askAnything")}
          aria-label={t("chatbot:chat.askAnything")}
          autoresize
          maxH="10rem"
          rows={1}
          variant="subtle"
          bg="transparent"
          border="none"
          _focus={{ outline: "none", boxShadow: "none" }}
        />
        {isBusy ? (
          <IconButton
            aria-label={t("chat.stopGenerating")}
            size="sm"
            variant="solid"
            colorPalette="red"
            onClick={cancelStreaming}
          >
            <Square size={14} />
          </IconButton>
        ) : (
          <IconButton
            aria-label={t("chat.sendMessage")}
            size="sm"
            variant="solid"
            bg="accent"
            color="accentFg"
            _hover={{ bg: "accentEmphasis" }}
            disabled={!canSend}
            onClick={send}
          >
            <Send size={14} />
          </IconButton>
        )}
      </div>
      <p className="mt-1.5 text-center text-xs text-text-faint">
        {t("chat.aiDisclaimer")}
      </p>
    </div>
  );
}
