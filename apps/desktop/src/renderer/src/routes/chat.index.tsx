import { defaultAgentOptions } from "@renderer/features/agents";
import { ChatLanding } from "@renderer/features/chat";
import { ErrorBoundary } from "@renderer/shared/components/ErrorBoundary";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/chat/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(defaultAgentOptions()),
  component: ChatIndexRoute,
});

function ChatIndexRoute(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <ChatLanding />
    </ErrorBoundary>
  );
}
