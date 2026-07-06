import {
  ApiError,
  buildApiUrl,
  buildAuthHeaders,
  statusToCode,
} from "./api-client";

const DEFAULT_STALL_TIMEOUT_MS = 60_000;

export type SseStreamOptions = {
  path: string;
  body: unknown;
  /** Caller-side cancellation (stop button, resend). Aborting is silent. */
  signal: AbortSignal;
  /** Max quiet time between chunks before the stream is treated as dead. */
  stallTimeoutMs?: number;
  onLine: (line: string) => void;
};

/**
 * POST-based SSE transport: fetch + ReadableStream line reader.
 * - caller abort (via `signal`) → resolves silently
 * - HTTP error before the stream starts → ApiError with mapped code
 * - connection drop mid-stream → ApiError("STREAM_INTERRUPTED")
 * - no chunk for `stallTimeoutMs` → ApiError("TIMEOUT")
 */
export async function streamSseLines({
  path,
  body,
  signal,
  stallTimeoutMs = DEFAULT_STALL_TIMEOUT_MS,
  onLine,
}: SseStreamOptions): Promise<void> {
  const stallController = new AbortController();
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  const resetStallTimer = (): void => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => stallController.abort(), stallTimeoutMs);
  };

  try {
    let response: Response;
    resetStallTimer();
    try {
      response = await fetch(buildApiUrl(path), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(await buildAuthHeaders()),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.any([signal, stallController.signal]),
      });
    } catch (error) {
      if (signal.aborted) return;
      if (stallController.signal.aborted) {
        throw new ApiError("Stream timed out", "TIMEOUT", { cause: error });
      }
      throw new ApiError(`${path} failed to connect`, "NETWORK", {
        cause: error,
      });
    }

    if (!response.ok) {
      throw new ApiError(
        `${path} responded with ${response.status}`,
        statusToCode(response.status),
        { status: response.status },
      );
    }
    if (!response.body) {
      throw new ApiError("Stream body missing", "STREAM_INTERRUPTED");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (error) {
        if (signal.aborted) return;
        if (stallController.signal.aborted) {
          throw new ApiError("Stream timed out", "TIMEOUT", { cause: error });
        }
        throw new ApiError("Stream interrupted", "STREAM_INTERRUPTED", {
          cause: error,
        });
      }
      resetStallTimer();
      if (chunk.done) break;

      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) onLine(line);
    }

    // Flush a trailing line that arrived without a final newline.
    buffer += decoder.decode();
    if (buffer.trim() !== "") onLine(buffer);
  } finally {
    clearTimeout(stallTimer);
  }
}
