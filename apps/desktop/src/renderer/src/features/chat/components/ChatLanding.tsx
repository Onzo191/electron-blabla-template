import { Button, Skeleton } from "@chakra-ui/react";
import {
  AgentGreeting,
  PromptTopics,
  useAgentBasicInfo,
  useDefaultAgent,
} from "@renderer/features/agents";
import { useAppStore } from "@renderer/store/useAppStore";
import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NEW_CONVERSATION_DRAFT_KEY } from "../store/chatSlice";
import { ChatActionsHost } from "./ChatActionsHost";
import { ChatInput } from "./ChatInput";
import { StreamingBubble } from "./StreamingBubble";

/** Shown when the agent can't be loaded — most commonly a missing/invalid token. */
function NotReadyPrompt(): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const openSettings = useAppStore((state) => state.openSettings);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <KeyRound size={28} className="text-text-faint" />
      <p className="text-sm font-medium">{t("chat.notReadyTitle")}</p>
      <p className="max-w-sm text-sm text-text-muted">
        {t("chat.notReadyDescription")}
      </p>
      <Button size="sm" onClick={() => openSettings("account")}>
        {t("chat.notReadyAction")}
      </Button>
    </div>
  );
}

/**
 * Landing page: agent greeting + prompt topics + first-message input.
 * A brand-new stream renders here (activeConversationId is still null)
 * until the `conversation` SSE event triggers the redirect to the detail
 * route — the slice-owned stream survives the transition.
 */
export function ChatLanding(): React.JSX.Element {
  const selectedAgent = useAppStore((state) => state.selectedAgent);
  const sendMessage = useAppStore((state) => state.sendMessage);
  const streamStatus = useAppStore((state) => state.streamStatus);
  const activeConversationId = useAppStore(
    (state) => state.activeConversationId,
  );
  const defaultAgentQuery = useDefaultAgent();
  const agentInfoQuery = useAgentBasicInfo(selectedAgent?.id ?? null);

  const newStreamHere =
    streamStatus !== "idle" && activeConversationId === null;
  // selectedAgent only becomes non-null once defaultAgentQuery resolves
  // (ChatSidebar wires that up), so its error is the one that matters here.
  const notReady = selectedAgent === null && defaultAgentQuery.isError;

  return (
    <ChatActionsHost draftKey={NEW_CONVERSATION_DRAFT_KEY}>
      <div className="flex h-full flex-col">
        <div className="mx-auto flex h-full w-full max-w-content flex-col px-4">
          {/* Golden-section split: the hero settles at ~38.2% down rather
              than dead center (docs/design-system.md). */}
          <div className="grow-[0.382]" aria-hidden />
          <div className="flex min-h-0 shrink flex-col items-center gap-6 overflow-y-auto py-8">
            {newStreamHere ? (
              <StreamingBubble />
            ) : notReady ? (
              <NotReadyPrompt />
            ) : agentInfoQuery.data ? (
              <>
                <AgentGreeting agent={agentInfoQuery.data} />
                <div className="flex justify-center">
                  <PromptTopics
                    topics={agentInfoQuery.data.promptTopics ?? []}
                    onSelect={(prompt) => sendMessage({ question: prompt })}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Skeleton height="12" width="12" borderRadius="full" />
                <Skeleton height="6" width="40" />
                <Skeleton height="4" width="80" />
              </div>
            )}
          </div>
          <div className="grow-[0.618]" aria-hidden />
        </div>
        <ChatInput
          draftKey={NEW_CONVERSATION_DRAFT_KEY}
          onSend={(text) => sendMessage({ question: text })}
        />
      </div>
    </ChatActionsHost>
  );
}
