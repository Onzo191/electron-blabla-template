import type { MediaItem } from "@myvng/shared";
import { createContext, useContext } from "react";

/**
 * How widgets talk back to the chat (suggestion chips submit, colleague-card
 * manager lookup, media lightbox, copy-to-clipboard) without importing
 * stores or other features. Provided by ChatConversation / ChatLanding.
 */
export type ChatActions = {
  submitMessage: (text: string) => void;
  prefillInput: (text: string) => void;
  openLightbox: (items: MediaItem[], index: number) => void;
  copyToClipboard: (value: string) => void;
};

const ChatActionsContext = createContext<ChatActions | null>(null);

export const ChatActionsProvider = ChatActionsContext.Provider;

export function useChatActions(): ChatActions {
  const actions = useContext(ChatActionsContext);
  if (actions === null) {
    throw new Error("useChatActions must be used inside ChatActionsProvider");
  }
  return actions;
}
