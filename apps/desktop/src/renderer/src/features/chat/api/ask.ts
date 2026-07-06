import { type AppError, parseAskSseLine, type Reference } from "@myvng/shared";
import { streamSseLines } from "@renderer/shared/lib/sse";

export type AskPayload = {
  question: string;
  agentId: string;
  conversationId?: string;
  attachmentIds: string[];
  enableWebSearch: boolean;
  timeZone: string;
};

export type AskCallbacks = {
  onConversation: (event: { id: string; name: string }) => void;
  onMessageMeta: (event: { messageId: string; responseTime?: number }) => void;
  onReasoning: (text: string) => void;
  onToolStatus: (event: { tool: string; label: string }) => void;
  onResponse: (text: string) => void;
  onReferences: (references: Reference[]) => void;
  /** A `{ error }` event arrived mid-stream; reading continues until [DONE]/close. */
  onStreamError: (error: AppError) => void;
  onDone: () => void;
};

/**
 * Runs one ask request over SSE, dispatching normalized events to callbacks.
 * Transport failures (connect, interrupt, timeout) reject with ApiError;
 * caller aborts resolve silently.
 */
export function streamAsk(
  payload: AskPayload,
  callbacks: AskCallbacks,
  signal: AbortSignal,
): Promise<void> {
  return streamSseLines({
    path: "/v2/api/messages/ask",
    body: payload,
    signal,
    onLine: (line) => {
      const event = parseAskSseLine(line);
      if (event === null) return;
      switch (event.kind) {
        case "start":
          break;
        case "conversation":
          callbacks.onConversation({ id: event.id, name: event.name });
          break;
        case "message-meta":
          callbacks.onMessageMeta({
            messageId: event.messageId,
            responseTime: event.responseTime,
          });
          break;
        case "reasoning":
          callbacks.onReasoning(event.text);
          break;
        case "tool-status":
          callbacks.onToolStatus({ tool: event.tool, label: event.label });
          break;
        case "response":
          callbacks.onResponse(event.text);
          break;
        case "references":
          callbacks.onReferences(event.references);
          break;
        case "stream-error":
          callbacks.onStreamError({
            code: "STREAM_ERROR",
            message: event.message,
          });
          break;
        case "done":
          callbacks.onDone();
          break;
      }
    },
  });
}
