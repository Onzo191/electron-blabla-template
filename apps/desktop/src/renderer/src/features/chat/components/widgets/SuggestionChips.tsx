import type { SuggestionsPayload } from "@myvng/shared";
import { ChipButton } from "@renderer/shared/components/ChipButton";
import { useChatActions } from "../ChatActionsContext";

/** Follow-up prompt chips; only actionable on the newest message. */
export function SuggestionChips({
  payload,
  isLastMessage,
}: {
  payload: SuggestionsPayload;
  isLastMessage: boolean;
}): React.JSX.Element | null {
  const { submitMessage } = useChatActions();

  if (!isLastMessage || payload.items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {payload.intro ? (
        <p className="text-sm text-text-muted">{payload.intro}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {payload.items.map((item) => (
          <ChipButton key={item} onClick={() => submitMessage(item)}>
            {item}
          </ChipButton>
        ))}
      </div>
    </div>
  );
}
