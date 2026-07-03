import { Spinner } from "@chakra-ui/react";
import { useConversations } from "../hooks/useConversations";

export function ConversationList(): React.JSX.Element {
  const { data, isPending, isError } = useConversations();

  if (isPending) {
    return <Spinner aria-label="Loading conversations" size="sm" />;
  }

  if (isError) {
    return <p role="alert">Couldn&apos;t load conversations.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {data.map((conversation) => (
        <li
          key={conversation.id}
          className="rounded-md border border-surface-200 px-3 py-2 text-sm"
        >
          {conversation.title}
        </li>
      ))}
    </ul>
  );
}
