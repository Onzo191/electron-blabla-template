import { Button, Skeleton } from "@chakra-ui/react";
import {
  AgentGreeting,
  PromptTopics,
  useAgentBasicInfo,
  useDefaultAgent,
} from "@renderer/features/agents";
import { useAppStore } from "@renderer/store/useAppStore";
import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { NEW_CONVERSATION_DRAFT_KEY } from "../store/chatSlice";
import { ChatActionsHost } from "./ChatActionsHost";
import { ChatInput } from "./ChatInput";
import { StreamingBubble } from "./StreamingBubble";

/** Shown when the agent can't be loaded — most commonly a missing/invalid token. */
function NotReadyPrompt(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <KeyRound size={28} className="text-text-faint" />
      <p className="text-sm font-medium">Couldn't load the assistant</p>
      <p className="max-w-sm text-sm text-text-muted">
        This usually means the API token isn't set yet. Add it in Settings, then
        come back here.
      </p>
      <Button asChild size="sm">
        <Link to="/settings">Go to Settings</Link>
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
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-6 py-8">
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
        </div>
        <ChatInput
          draftKey={NEW_CONVERSATION_DRAFT_KEY}
          onSend={(text) => sendMessage({ question: text })}
        />
      </div>
    </ChatActionsHost>
  );
}
