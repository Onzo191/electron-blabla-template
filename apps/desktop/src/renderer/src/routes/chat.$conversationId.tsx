import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/chat/$conversationId")({
  component: ChatRoute,
});

function ChatRoute(): React.JSX.Element {
  const { conversationId } = Route.useParams();

  return (
    <div>
      <h1 className="text-lg font-semibold">Chat {conversationId}</h1>
      <p className="text-sm text-text-muted">
        Chat streaming UI lands in Phase 4.
      </p>
    </div>
  );
}
