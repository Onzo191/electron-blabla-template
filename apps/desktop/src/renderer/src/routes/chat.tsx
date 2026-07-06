import {
  agentListInfiniteOptions,
  defaultAgentOptions,
} from "@renderer/features/agents";
import { ChatSidebar, ChatStreamRedirector } from "@renderer/features/chat";
import { pinnedConversationsOptions } from "@renderer/features/conversations";
import { ErrorBoundary } from "@renderer/shared/components/ErrorBoundary";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/chat")({
  // Warm the caches the sidebar needs; loaders never own data (staleTime
  // keeps components from refetching immediately).
  loader: ({ context }) => {
    void context.queryClient.prefetchInfiniteQuery(agentListInfiniteOptions());
    void context.queryClient.prefetchQuery(pinnedConversationsOptions());
    void context.queryClient.prefetchQuery(defaultAgentOptions());
  },
  component: ChatLayout,
});

function ChatLayout(): React.JSX.Element {
  return (
    <div className="flex h-full w-full">
      <ChatStreamRedirector />
      <ErrorBoundary>
        <ChatSidebar />
      </ErrorBoundary>
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
