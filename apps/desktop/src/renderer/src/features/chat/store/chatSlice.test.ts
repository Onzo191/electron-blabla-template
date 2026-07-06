import type { AppError, Reference } from "@myvng/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import type { AskCallbacks, AskPayload } from "../api/ask";
import { type ChatSlice, createChatSlice } from "./chatSlice";

function createScheduler() {
  let nextId = 0;
  const queue = new Map<number, () => void>();
  return {
    raf: (callback: () => void): number => {
      nextId += 1;
      queue.set(nextId, callback);
      return nextId;
    },
    caf: (id: number): void => {
      queue.delete(id);
    },
    /** Runs one animation frame. */
    step(): void {
      const callbacks = [...queue.values()];
      queue.clear();
      for (const callback of callbacks) callback();
    },
    /** Runs frames until the queue drains (bounded). */
    drain(): void {
      for (let i = 0; i < 10_000 && queue.size > 0; i += 1) this.step();
    },
    get pending(): number {
      return queue.size;
    },
  };
}

type Captured = {
  payload: AskPayload;
  callbacks: AskCallbacks;
  signal: AbortSignal;
};

function setup() {
  const scheduler = createScheduler();
  const asks: Captured[] = [];
  const askResolvers: (() => void)[] = [];
  const ask = vi.fn(
    (payload: AskPayload, callbacks: AskCallbacks, signal: AbortSignal) => {
      asks.push({ payload, callbacks, signal });
      return new Promise<void>((resolve) => {
        askResolvers.push(resolve);
      });
    },
  );
  const cache = {
    seedNewConversation: vi.fn(),
    writeCompletedExchange: vi.fn(),
    invalidateConversationLists: vi.fn(),
  };
  const store = createStore<ChatSlice>()(
    createChatSlice({
      raf: scheduler.raf,
      caf: scheduler.caf,
      ask,
      cache,
      uuid: () => "uuid-1",
      now: () => "2026-07-06T00:00:00.000Z",
      timeZone: () => "Asia/Ho_Chi_Minh",
    }),
  );
  store.getState().setSelectedAgent({ id: "agent-1", name: "VNG Assistant" });
  return { store, scheduler, ask, asks, askResolvers, cache };
}

describe("chatSlice streaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not start a stream without a selected agent", () => {
    const { store, ask } = setup();
    store.getState().setSelectedAgent(null);
    store.getState().sendMessage({ question: "hello" });
    expect(ask).not.toHaveBeenCalled();
  });

  it("does not start a stream for a blank question", () => {
    const { store, ask } = setup();
    store.getState().sendMessage({ question: "   " });
    expect(ask).not.toHaveBeenCalled();
  });

  it("sends the optimistic user message and enters connecting state", () => {
    const { store, asks } = setup();
    store.getState().sendMessage({ question: "What is the policy?" });
    expect(store.getState().streamStatus).toBe("connecting");
    expect(store.getState().pendingUserMessage).toEqual({
      content: "What is the policy?",
    });
    expect(asks[0]?.payload).toMatchObject({
      question: "What is the policy?",
      agentId: "agent-1",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  });

  it("drains response tokens through the scheduler in order", () => {
    const { store, scheduler, asks } = setup();
    store.getState().sendMessage({ question: "q", conversationId: "c1" });
    asks[0]?.callbacks.onResponse("Hello brave new");
    expect(store.getState().streamStatus).toBe("streaming");
    scheduler.step();
    expect(store.getState().streamedText).toBe("Hello");
    scheduler.drain();
    expect(store.getState().streamedText).toBe("Hello brave new");
  });

  it("flushes the remaining queue and writes the exchange on done", () => {
    const { store, scheduler, asks, cache } = setup();
    store.getState().sendMessage({ question: "q", conversationId: "c1" });
    asks[0]?.callbacks.onMessageMeta({ messageId: "msg-1", responseTime: 0.4 });
    asks[0]?.callbacks.onResponse("Final answer here");
    scheduler.step(); // only part of the queue has painted
    asks[0]?.callbacks.onDone();

    expect(cache.writeCompletedExchange).toHaveBeenCalledTimes(1);
    const [conversationId, userMessage, botMessage] = cache
      .writeCompletedExchange.mock.calls[0] as [
      string,
      { content: string; role: string },
      { content: string; role: string; id: string; responseTime?: number },
    ];
    expect(conversationId).toBe("c1");
    expect(userMessage).toMatchObject({ role: "user", content: "q" });
    expect(botMessage).toMatchObject({
      role: "assistant",
      content: "Final answer here",
      id: "msg-1",
      responseTime: 0.4,
    });
    expect(cache.invalidateConversationLists).toHaveBeenCalled();
    expect(store.getState().streamStatus).toBe("idle");
    expect(store.getState().streamedText).toBe("");
  });

  it("seeds the cache and requests a redirect on the conversation event", () => {
    const { store, asks, cache } = setup();
    store.getState().sendMessage({ question: "first message" });
    asks[0]?.callbacks.onConversation({ id: "conv-9", name: "New chat" });

    expect(cache.seedNewConversation).toHaveBeenCalledWith("conv-9");
    expect(store.getState().activeConversationId).toBe("conv-9");
    expect(store.getState().pendingRedirectConversationId).toBe("conv-9");
    expect(store.getState().consumeRedirect()).toBe("conv-9");
    expect(store.getState().pendingRedirectConversationId).toBeNull();
  });

  it("ignores late events from a superseded stream", () => {
    const { store, scheduler, asks } = setup();
    store.getState().sendMessage({ question: "first", conversationId: "c1" });
    const first = asks[0];
    store.getState().sendMessage({ question: "second", conversationId: "c1" });

    first?.callbacks.onResponse("stale tokens");
    scheduler.drain();
    expect(store.getState().streamedText).toBe("");
    expect(first?.signal.aborted).toBe(true);

    asks[1]?.callbacks.onResponse("fresh");
    scheduler.drain();
    expect(store.getState().streamedText).toBe("fresh");
  });

  it("keeps the partial text as a completed exchange when cancelled", () => {
    const { store, scheduler, asks, cache } = setup();
    store.getState().sendMessage({ question: "q", conversationId: "c1" });
    asks[0]?.callbacks.onResponse("partial answer");
    scheduler.drain();
    store.getState().cancelStreaming();

    expect(cache.writeCompletedExchange).toHaveBeenCalledTimes(1);
    expect(store.getState().streamStatus).toBe("idle");
  });

  it("resets without writing when cancelled before any text", () => {
    const { store, cache } = setup();
    store.getState().sendMessage({ question: "q", conversationId: "c1" });
    store.getState().cancelStreaming();

    expect(cache.writeCompletedExchange).not.toHaveBeenCalled();
    expect(store.getState().streamStatus).toBe("idle");
  });

  it("enters error state on a mid-stream error event and retries", () => {
    const { store, asks } = setup();
    store.getState().sendMessage({ question: "q", conversationId: "c1" });
    const error: AppError = { code: "STREAM_ERROR", message: "boom" };
    asks[0]?.callbacks.onStreamError(error);

    expect(store.getState().streamStatus).toBe("error");
    expect(store.getState().streamError).toEqual(error);

    store.getState().retryLastAsk();
    expect(asks).toHaveLength(2);
    expect(asks[1]?.payload.question).toBe("q");
    expect(store.getState().streamStatus).toBe("connecting");
  });

  it("stores references from the stream", () => {
    const { store, asks } = setup();
    store.getState().sendMessage({ question: "q", conversationId: "c1" });
    const references: Reference[] = [{ title: "Doc", url: "https://x" }];
    asks[0]?.callbacks.onReferences(references);
    expect(store.getState().streamReferences).toEqual(references);
  });

  it("keeps per-conversation drafts", () => {
    const { store } = setup();
    store.getState().setDraft("c1", "draft one");
    store.getState().setDraft("new", "landing draft");
    expect(store.getState().drafts).toEqual({
      c1: "draft one",
      new: "landing draft",
    });
  });
});
