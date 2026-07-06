import { toaster } from "@renderer/shared/components/toaster";
import { useAppStore } from "@renderer/store/useAppStore";
import { type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ChatActions, ChatActionsProvider } from "./ChatActionsContext";
import { type LightboxState, MediaLightbox } from "./MediaLightbox";

/**
 * Provides the ChatActions context (widget → chat event flow) plus the
 * media lightbox for one chat page (landing or conversation detail).
 */
export function ChatActionsHost({
  draftKey,
  conversationId,
  children,
}: {
  draftKey: string;
  conversationId?: string;
  children: ReactNode;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const sendMessage = useAppStore((state) => state.sendMessage);
  const setDraft = useAppStore((state) => state.setDraft);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const actions = useMemo<ChatActions>(
    () => ({
      submitMessage: (text) => sendMessage({ question: text, conversationId }),
      prefillInput: (text) => setDraft(draftKey, text),
      openLightbox: (items, index) => setLightbox({ items, index }),
      copyToClipboard: (value) => {
        void navigator.clipboard.writeText(value).then(() => {
          toaster.success({ title: t("message.copiedToClipboard") });
        });
      },
    }),
    [conversationId, draftKey, sendMessage, setDraft, t],
  );

  return (
    <ChatActionsProvider value={actions}>
      {children}
      <MediaLightbox
        state={lightbox}
        onClose={() => setLightbox(null)}
        onNavigate={(index) =>
          setLightbox((state) => (state ? { ...state, index } : state))
        }
      />
    </ChatActionsProvider>
  );
}
