import { ConversationList } from "@renderer/features/conversations";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute(): React.JSX.Element {
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Conversations</h1>
      <ConversationList />
    </div>
  );
}
