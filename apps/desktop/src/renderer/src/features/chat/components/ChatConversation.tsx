import { ErrorBoundary } from "@renderer/shared/components/ErrorBoundary";
import { useAppStore } from "@renderer/store/useAppStore";
import { ChatActionsHost } from "./ChatActionsHost";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";

/**
 * Conversation detail page. MessageList gets its own boundary so a render
 * crash in the thread never destroys the composer (and its draft).
 */
export function ChatConversation({
  conversationId,
}: {
  conversationId: string;
}): React.JSX.Element {
  const sendMessage = useAppStore((state) => state.sendMessage);

  return (
    <ChatActionsHost draftKey={conversationId} conversationId={conversationId}>
      <div className="flex h-full flex-col">
        <ErrorBoundary>
          <MessageList conversationId={conversationId} />
        </ErrorBoundary>
        <ChatInput
          draftKey={conversationId}
          onSend={(text) => sendMessage({ question: text, conversationId })}
        />
      </div>
    </ChatActionsHost>
  );
}
