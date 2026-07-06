import type { PromptTopic } from "@myvng/shared";
import { ChipButton } from "@renderer/shared/components/ChipButton";

function topicLabel(topic: PromptTopic): string | null {
  return topic.title ?? topic.name ?? topic.label ?? topic.content ?? null;
}

function topicPrompt(topic: PromptTopic): string | null {
  return topic.content ?? topicLabel(topic);
}

/** Quick-start prompt chips shown under the agent greeting. */
export function PromptTopics({
  topics,
  onSelect,
}: {
  topics: PromptTopic[];
  onSelect: (prompt: string) => void;
}): React.JSX.Element | null {
  const visible = topics
    .map((topic) => ({ label: topicLabel(topic), prompt: topicPrompt(topic) }))
    .filter(
      (item): item is { label: string; prompt: string } =>
        item.label !== null && item.prompt !== null,
    );

  if (visible.length === 0) return null;

  return (
    <div className="flex max-w-xl flex-wrap justify-center gap-2">
      {visible.map((item) => (
        <ChipButton key={item.label} onClick={() => onSelect(item.prompt)}>
          {item.label}
        </ChipButton>
      ))}
    </div>
  );
}
