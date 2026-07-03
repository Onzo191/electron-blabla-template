/**
 * UI-facing error shape for Error Boundaries and local error handling.
 * Unlike the wire-safe `AppError` in `@myvng/shared` (which never crosses
 * into an IPC payload with a `cause`), this one stays in the renderer, so
 * it's free to carry the original error for logging/debugging.
 */
export type AppError = {
  code: string;
  message: string;
  cause?: unknown;
};

function hasStringCode(error: object): error is { code: string } {
  return "code" in error && typeof error.code === "string";
}

export function toAppError(error: unknown): AppError {
  if (error instanceof Error) {
    return {
      code: hasStringCode(error) ? error.code : "INTERNAL",
      message: error.message,
      cause: error.cause ?? error,
    };
  }
  return { code: "UNKNOWN", message: String(error), cause: error };
}
