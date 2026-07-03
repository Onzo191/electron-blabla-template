import { ConversationList } from "@renderer/features/conversations";
import { ErrorBoundary } from "@renderer/shared/components/ErrorBoundary";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <div>
        <h1 className="mb-4 text-lg font-semibold">Conversations</h1>
        <ConversationList />
      </div>
    </ErrorBoundary>
  );
}
