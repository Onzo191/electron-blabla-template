import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../../tests/msw/server";
import { ApiError } from "./api-client";
import { invalidateAuthTokenCache } from "./auth-token";
import { streamSseLines } from "./sse";

const ASK_URL = "http://localhost:4000/v2/api/messages/ask";
const encoder = new TextEncoder();

function sseResponse(
  build: (controller: ReadableStreamDefaultController<Uint8Array>) => void,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      build(controller);
    },
  });
  return new HttpResponse(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("streamSseLines", () => {
  beforeEach(() => {
    invalidateAuthTokenCache();
    vi.stubGlobal("api", {
      invoke: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { token: "tok-123" } }),
    });
    Object.assign(window, { api: globalThis.api });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reassembles lines split across chunks", async () => {
    server.use(
      http.post(ASK_URL, () =>
        sseResponse((controller) => {
          controller.enqueue(encoder.encode('data: {"resp'));
          controller.enqueue(encoder.encode('onse":"Hello"}\n'));
          controller.enqueue(encoder.encode("data: [DONE]\n"));
          controller.close();
        }),
      ),
    );

    const lines: string[] = [];
    await streamSseLines({
      path: "/v2/api/messages/ask",
      body: {},
      signal: new AbortController().signal,
      onLine: (line) => lines.push(line),
    });
    expect(lines).toEqual(['data: {"response":"Hello"}', "data: [DONE]"]);
  });

  it("flushes a trailing line that has no final newline", async () => {
    server.use(
      http.post(ASK_URL, () =>
        sseResponse((controller) => {
          controller.enqueue(encoder.encode("data: [DONE]"));
          controller.close();
        }),
      ),
    );

    const lines: string[] = [];
    await streamSseLines({
      path: "/v2/api/messages/ask",
      body: {},
      signal: new AbortController().signal,
      onLine: (line) => lines.push(line),
    });
    expect(lines).toEqual(["data: [DONE]"]);
  });

  it("throws a mapped ApiError for a pre-stream HTTP failure", async () => {
    server.use(
      http.post(ASK_URL, () => new HttpResponse(null, { status: 401 })),
    );

    await expect(
      streamSseLines({
        path: "/v2/api/messages/ask",
        body: {},
        signal: new AbortController().signal,
        onLine: () => {},
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  });

  it("resolves silently when the caller aborts mid-stream", async () => {
    let streamController: ReadableStreamDefaultController<Uint8Array> | null =
      null;
    server.use(
      http.post(ASK_URL, () =>
        sseResponse((controller) => {
          streamController = controller;
          controller.enqueue(encoder.encode("data: [START]\n"));
          // stream intentionally left open
        }),
      ),
    );

    const controller = new AbortController();
    const lines: string[] = [];
    const promise = streamSseLines({
      path: "/v2/api/messages/ask",
      body: {},
      signal: controller.signal,
      onLine: (line) => {
        lines.push(line);
        controller.abort();
        // MSW's mocked body isn't wired to the fetch signal, so emulate the
        // reader rejection a real aborted fetch produces.
        streamController?.error(new DOMException("aborted", "AbortError"));
      },
    });

    await expect(promise).resolves.toBeUndefined();
    expect(lines).toEqual(["data: [START]"]);
  });

  it("throws STREAM_INTERRUPTED when the connection drops mid-stream", async () => {
    let streamController: ReadableStreamDefaultController<Uint8Array> | null =
      null;
    server.use(
      http.post(ASK_URL, () =>
        sseResponse((controller) => {
          streamController = controller;
          controller.enqueue(encoder.encode("data: [START]\n"));
        }),
      ),
    );

    const promise = streamSseLines({
      path: "/v2/api/messages/ask",
      body: {},
      signal: new AbortController().signal,
      onLine: () => {
        streamController?.error(new TypeError("network error"));
      },
    });

    await expect(promise).rejects.toMatchObject({
      code: "STREAM_INTERRUPTED",
    });
  });

  it("sends the bearer token from the auth cache", async () => {
    let authHeader: string | null = null;
    server.use(
      http.post(ASK_URL, ({ request }) => {
        authHeader = request.headers.get("authorization");
        return sseResponse((controller) => {
          controller.enqueue(encoder.encode("data: [DONE]\n"));
          controller.close();
        });
      }),
    );

    await streamSseLines({
      path: "/v2/api/messages/ask",
      body: {},
      signal: new AbortController().signal,
      onLine: () => {},
    });
    expect(authHeader).toBe("Bearer tok-123");
  });

  it("exposes ApiError for use-site instanceof checks", () => {
    expect(new ApiError("x", "NETWORK")).toBeInstanceOf(Error);
  });
});
