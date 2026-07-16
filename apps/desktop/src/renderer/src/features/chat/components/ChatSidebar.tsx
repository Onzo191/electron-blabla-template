import { Button, IconButton } from "@chakra-ui/react";
import { AgentPicker, useDefaultAgent } from "@renderer/features/agents";
import { ConversationSidebarList } from "@renderer/features/conversations";
import { useAppStore } from "@renderer/store/useAppStore";
import { Link } from "@tanstack/react-router";
import { Settings, SquarePen } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePrefetchConversation } from "../hooks/usePrefetchConversation";

export function ChatSidebar(): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const selectedAgent = useAppStore((state) => state.selectedAgent);
  const setSelectedAgent = useAppStore((state) => state.setSelectedAgent);
  const openSettings = useAppStore((state) => state.openSettings);
  const defaultAgentQuery = useDefaultAgent();
  const prefetchConversation = usePrefetchConversation();

  // Fall back to the default agent until the user picks one explicitly.
  const defaultAgent = defaultAgentQuery.data;
  useEffect(() => {
    if (selectedAgent === null && defaultAgent != null) {
      setSelectedAgent(defaultAgent);
    }
  }, [selectedAgent, defaultAgent, setSelectedAgent]);

  return (
    <aside className="flex h-full min-w-0 flex-col overflow-hidden border-r border-border-subtle bg-surface-100">
      <div className="flex items-center gap-1 p-2">
        <div className="min-w-0 flex-1">
          <AgentPicker
            selectedAgent={selectedAgent}
            onSelect={setSelectedAgent}
          />
        </div>
        <Link to="/chat" aria-label={t("actions.newChat")}>
          <IconButton
            aria-label={t("actions.newChat")}
            size="sm"
            variant="ghost"
            color="textMuted"
            as="span"
          >
            <SquarePen size={16} />
          </IconButton>
        </Link>
      </div>

      <ConversationSidebarList onItemHover={prefetchConversation} />

      <div className="border-t border-border-subtle p-2">
        <Button
          size="sm"
          variant="ghost"
          justifyContent="flex-start"
          width="full"
          color="textMuted"
          onClick={() => openSettings()}
        >
          <Settings size={15} />
          {t("settings.title")}
        </Button>
      </div>
    </aside>
  );
}
