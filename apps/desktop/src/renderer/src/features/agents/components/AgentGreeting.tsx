import type { AgentDetail } from "@myvng/shared";
import { SafeHtml } from "@renderer/shared/components/SafeHtml";
import { useTranslation } from "react-i18next";

function pickGreetingHtml(agent: AgentDetail, language: string): string | null {
  const translations =
    agent.greetingMessages?.flatMap(
      (message) => message.greetingMessageTranslations,
    ) ?? [];
  if (translations.length === 0) return null;
  const match =
    translations.find((item) => item.language === language) ??
    translations.find((item) => item.language === "en") ??
    translations[0];
  return match?.content ?? null;
}

export function AgentGreeting({
  agent,
}: {
  agent: AgentDetail;
}): React.JSX.Element {
  const { i18n, t } = useTranslation("aiAgents");
  const greetingHtml = pickGreetingHtml(agent, i18n.language);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {agent.icon ? (
        <img
          src={agent.icon}
          alt=""
          className="h-12 w-12 rounded-full object-cover"
        />
      ) : null}
      <h1 className="text-xl font-semibold">{agent.name}</h1>
      {greetingHtml ? (
        <SafeHtml
          html={greetingHtml}
          className="max-w-lg text-sm text-text-muted"
        />
      ) : (
        <p className="max-w-lg text-sm text-text-muted">
          {t("chat.greeting", { value1: "" }).trim()}
        </p>
      )}
    </div>
  );
}
