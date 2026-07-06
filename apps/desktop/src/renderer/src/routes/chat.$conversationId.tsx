import {
  ChatConversation,
  messagesInfiniteOptions,
} from "@renderer/features/chat";
import { ErrorBoundary } from "@renderer/shared/components/ErrorBoundary";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/chat/$conversationId")({
  // Warm the first history page. Not awaited: a seeded brand-new
  // conversation must render instantly without waiting on the network.
  loader: ({ context, params }) => {
    void context.queryClient.prefetchInfiniteQuery({
      ...messagesInfiniteOptions(params.conversationId),
      pages: 1,
    });
  },
  component: ChatConversationRoute,
});

function ChatConversationRoute(): React.JSX.Element {
  const { conversationId } = Route.useParams();

  return (
    <ErrorBoundary>
      <ChatConversation conversationId={conversationId} key={conversationId} />
    </ErrorBoundary>
  );
}
