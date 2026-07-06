import type {
  AgentSummary,
  AppError,
  ChatMessage,
  Reference,
} from "@myvng/shared";
import { ApiError } from "@renderer/shared/lib/api-client";
import type { StateCreator } from "zustand";
import { type AskCallbacks, type AskPayload, streamAsk } from "../api/ask";
import {
  invalidateConversationLists,
  seedNewConversation,
  writeCompletedExchange,
} from "../api/cache";

export type StreamStatus = "idle" | "connecting" | "streaming" | "error";

/** Key used for the draft of a not-yet-created conversation. */
export const NEW_CONVERSATION_DRAFT_KEY = "new";

const TOKEN_SPLIT_REGEX = /\S+|\s+/g;

export type ChatSlice = {
  selectedAgent: AgentSummary | null;
  webSearchEnabled: boolean;
  streamStatus: StreamStatus;
  streamError: AppError | null;
  /** Conversation the in-flight stream belongs to (null until known). */
  activeConversationId: string | null;
  pendingUserMessage: { content: string } | null;
  streamingMessageId: string | null;
  /** Drained (visible) portion of the streamed markdown. */
  streamedText: string;
  reasoningText: string;
  toolStatus: { tool: string; label: string } | null;
  streamReferences: Reference[];
  responseTime: number | null;
  lastAskPayload: AskPayload | null;
  pendingRedirectConversationId: string | null;
  drafts: Record<string, string>;
  setSelectedAgent: (agent: AgentSummary | null) => void;
  toggleWebSearch: () => void;
  sendMessage: (input: { question: string; conversationId?: string }) => void;
  cancelStreaming: () => void;
  retryLastAsk: () => void;
  setDraft: (key: string, text: string) => void;
  consumeRedirect: () => string | null;
};

export type ChatSliceDeps = {
  raf: (callback: () => void) => number;
  caf: (id: number) => void;
  ask: typeof streamAsk;
  cache: {
    seedNewConversation: typeof seedNewConversation;
    writeCompletedExchange: typeof writeCompletedExchange;
    invalidateConversationLists: typeof invalidateConversationLists;
  };
  uuid: () => string;
  now: () => string;
  timeZone: () => string;
};

const defaultDeps: ChatSliceDeps = {
  raf: (callback) => requestAnimationFrame(callback),
  caf: (id) => cancelAnimationFrame(id),
  ask: streamAsk,
  cache: {
    seedNewConversation,
    writeCompletedExchange,
    invalidateConversationLists,
  },
  uuid: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
};

/**
 * Streaming chat state (ADR 4): SSE tokens land here so only the actively
 * typing bubble re-renders; the completed exchange is written into the Query
 * cache on done and this slice resets. The stream is store-owned — it
 * survives route transitions (landing → conversation detail).
 *
 * Non-renderable, high-churn machinery (AbortController, rAF id, token
 * queue) lives in the factory closure, never in state: one instance per
 * store, fully injectable for tests.
 */
export function createChatSlice(
  overrides: Partial<ChatSliceDeps> = {},
): StateCreator<ChatSlice, [], [], ChatSlice> {
  const deps: ChatSliceDeps = { ...defaultDeps, ...overrides };

  let controller: AbortController | null = null;
  let rafId: number | null = null;
  let tokenQueue: string[] = [];
  let fullText = "";
  let fullReasoning = "";
  let session = 0;
  let sawTerminalEvent = false;

  return (set, get) => {
    const stopDrain = (): void => {
      if (rafId !== null) {
        deps.caf(rafId);
        rafId = null;
      }
    };

    const drain = (): void => {
      rafId = null;
      if (tokenQueue.length === 0) return;
      // Spec paints 1 token/frame; scale the batch when the queue backs up
      // so the visible text never lags a fast stream by more than ~2s.
      const batchSize =
        tokenQueue.length > 200 ? 8 : tokenQueue.length > 60 ? 3 : 1;
      const batch = tokenQueue.splice(0, batchSize).join("");
      set((state) => ({ streamedText: state.streamedText + batch }));
      if (tokenQueue.length > 0) rafId = deps.raf(drain);
    };

    const resetStreamState = (): void => {
      stopDrain();
      tokenQueue = [];
      fullText = "";
      fullReasoning = "";
      sawTerminalEvent = false;
      set({
        streamStatus: "idle",
        streamError: null,
        activeConversationId: null,
        pendingUserMessage: null,
        streamingMessageId: null,
        streamedText: "",
        reasoningText: "",
        toolStatus: null,
        streamReferences: [],
        responseTime: null,
      });
    };

    /** Flush remaining tokens and commit the exchange to the Query cache. */
    const finalizeExchange = (): void => {
      stopDrain();
      tokenQueue = [];
      const state = get();
      const conversationId = state.activeConversationId;
      const pending = state.pendingUserMessage;
      if (
        conversationId !== null &&
        pending !== null &&
        (fullText !== "" || fullReasoning !== "")
      ) {
        const userMessage: ChatMessage = {
          id: deps.uuid(),
          role: "user",
          content: pending.content,
          createdAt: deps.now(),
        };
        const botMessage: ChatMessage = {
          id: state.streamingMessageId ?? deps.uuid(),
          role: "assistant",
          content: fullText,
          createdAt: deps.now(),
          reasoning: fullReasoning === "" ? undefined : fullReasoning,
          references:
            state.streamReferences.length === 0
              ? undefined
              : state.streamReferences,
          responseTime: state.responseTime ?? undefined,
        };
        deps.cache.writeCompletedExchange(
          conversationId,
          userMessage,
          botMessage,
        );
      }
      deps.cache.invalidateConversationLists();
      resetStreamState();
    };

    const startStream = (payload: AskPayload): void => {
      // A new send always cancels the previous stream; bump the session so
      // late events from the old stream can never corrupt the new one.
      controller?.abort();
      stopDrain();
      tokenQueue = [];
      fullText = "";
      fullReasoning = "";
      sawTerminalEvent = false;
      session += 1;
      const mySession = session;
      const isStale = (): boolean => session !== mySession;

      controller = new AbortController();
      set({
        streamStatus: "connecting",
        streamError: null,
        activeConversationId: payload.conversationId ?? null,
        pendingUserMessage: { content: payload.question },
        streamingMessageId: null,
        streamedText: "",
        reasoningText: "",
        toolStatus: null,
        streamReferences: [],
        responseTime: null,
        lastAskPayload: payload,
      });

      const callbacks: AskCallbacks = {
        onConversation: (event) => {
          if (isStale()) return;
          deps.cache.seedNewConversation(event.id);
          set({
            activeConversationId: event.id,
            pendingRedirectConversationId: event.id,
          });
        },
        onMessageMeta: (event) => {
          if (isStale()) return;
          set({
            streamingMessageId: event.messageId,
            responseTime: event.responseTime ?? null,
          });
        },
        onReasoning: (text) => {
          if (isStale()) return;
          fullReasoning += text;
          set({ reasoningText: fullReasoning, streamStatus: "streaming" });
        },
        onToolStatus: (event) => {
          if (isStale()) return;
          set({ toolStatus: event, streamStatus: "streaming" });
        },
        onResponse: (text) => {
          if (isStale()) return;
          fullText += text;
          const tokens = text.match(TOKEN_SPLIT_REGEX);
          if (tokens) tokenQueue.push(...tokens);
          // Tool work is over once prose starts.
          set({ streamStatus: "streaming", toolStatus: null });
          if (rafId === null) rafId = deps.raf(drain);
        },
        onReferences: (references) => {
          if (isStale()) return;
          set({ streamReferences: references });
        },
        onStreamError: (error) => {
          if (isStale()) return;
          sawTerminalEvent = true;
          stopDrain();
          tokenQueue = [];
          set({
            streamStatus: "error",
            streamError: error,
            streamedText: fullText,
            toolStatus: null,
          });
        },
        onDone: () => {
          if (isStale()) return;
          sawTerminalEvent = true;
          set({ streamedText: fullText, toolStatus: null });
          finalizeExchange();
        },
      };

      deps
        .ask(payload, callbacks, controller.signal)
        .then(() => {
          if (isStale() || sawTerminalEvent) return;
          // Stream closed cleanly without [DONE]; keep what we received.
          set({ streamedText: fullText, toolStatus: null });
          finalizeExchange();
        })
        .catch((error: unknown) => {
          if (isStale() || sawTerminalEvent) return;
          if (error instanceof ApiError && error.code === "ABORTED") return;
          stopDrain();
          tokenQueue = [];
          const appError: AppError =
            error instanceof ApiError
              ? { code: error.code, message: error.message }
              : { code: "UNKNOWN", message: String(error) };
          set({
            streamStatus: "error",
            streamError: appError,
            streamedText: fullText,
            toolStatus: null,
          });
        });
    };

    return {
      selectedAgent: null,
      webSearchEnabled: false,
      streamStatus: "idle",
      streamError: null,
      activeConversationId: null,
      pendingUserMessage: null,
      streamingMessageId: null,
      streamedText: "",
      reasoningText: "",
      toolStatus: null,
      streamReferences: [],
      responseTime: null,
      lastAskPayload: null,
      pendingRedirectConversationId: null,
      drafts: {},

      setSelectedAgent: (agent) => set({ selectedAgent: agent }),

      toggleWebSearch: () =>
        set((state) => ({ webSearchEnabled: !state.webSearchEnabled })),

      sendMessage: ({ question, conversationId }) => {
        const agentId = get().selectedAgent?.id;
        const trimmed = question.trim();
        if (agentId === undefined || trimmed === "") return;
        startStream({
          question: trimmed,
          agentId,
          conversationId,
          attachmentIds: [],
          enableWebSearch: get().webSearchEnabled,
          timeZone: deps.timeZone(),
        });
      },

      cancelStreaming: () => {
        session += 1;
        controller?.abort();
        controller = null;
        if (fullText !== "") {
          // Keep what was already generated, like closing the tap mid-pour.
          set({ streamedText: fullText });
          finalizeExchange();
        } else {
          resetStreamState();
        }
      },

      retryLastAsk: () => {
        const payload = get().lastAskPayload;
        if (payload === null) return;
        startStream({
          ...payload,
          conversationId:
            payload.conversationId ?? get().activeConversationId ?? undefined,
        });
      },

      setDraft: (key, text) =>
        set((state) => ({ drafts: { ...state.drafts, [key]: text } })),

      consumeRedirect: () => {
        const id = get().pendingRedirectConversationId;
        if (id !== null) set({ pendingRedirectConversationId: null });
        return id;
      },
    };
  };
}
