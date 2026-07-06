import { Button, Menu, Portal } from "@chakra-ui/react";
import type { AgentSummary } from "@myvng/shared";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAgentsInfinite } from "../hooks/useAgents";

export function AgentPicker({
  selectedAgent,
  onSelect,
}: {
  selectedAgent: AgentSummary | null;
  onSelect: (agent: AgentSummary) => void;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const agentsQuery = useAgentsInfinite();
  const agents = agentsQuery.data ?? [];

  return (
    <Menu.Root positioning={{ placement: "bottom-start" }}>
      <Menu.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="max-w-full"
          aria-label={t("sidebar.agents")}
        >
          <span className="truncate">
            {selectedAgent?.name ?? t("agent.defaultName")}
          </span>
          <ChevronDown size={14} />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content maxHeight="60vh" overflowY="auto">
            {agents.length === 0 ? (
              <Menu.Item value="empty" disabled>
                {t("sidebar.noAgentsFound")}
              </Menu.Item>
            ) : (
              agents.map((agent) => (
                <Menu.Item
                  key={agent.id}
                  value={agent.id}
                  onSelect={() => onSelect(agent)}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{agent.name}</span>
                    {agent.description ? (
                      <span className="truncate text-xs text-text-faint">
                        {agent.description}
                      </span>
                    ) : null}
                  </div>
                </Menu.Item>
              ))
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
