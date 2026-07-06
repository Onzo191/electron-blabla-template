import { defaultAgentOptions } from "@renderer/features/agents";
import { ChatLanding } from "@renderer/features/chat";
import { ErrorBoundary } from "@renderer/shared/components/ErrorBoundary";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/chat/")({
  // Non-throwing prefetch: an auth/network failure here must never blank
  // the route (no token yet is the expected first-run state) — the
  // component reads the same query and shows its own retry/CTA UI.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(defaultAgentOptions());
  },
  component: ChatIndexRoute,
});

function ChatIndexRoute(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <ChatLanding />
    </ErrorBoundary>
  );
}
