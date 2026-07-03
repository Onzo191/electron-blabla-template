import { z } from "zod";

/**
 * Wire-safe error shape for IPC and API boundaries. Never carries stacks,
 * causes, or non-serializable data.
 */
export const appErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type AppError = z.infer<typeof appErrorSchema>;

/** Envelope returned by every IPC channel. */
export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export function ipcOk<T>(data: T): IpcResult<T> {
  return { ok: true, data };
}

export function ipcErr<T = never>(error: AppError): IpcResult<T> {
  return { ok: false, error };
}

/** Error with a stable machine-readable code that survives toAppError. */
export class CodedError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CodedError";
    this.code = code;
  }
}

/** Normalize any thrown value into a wire-safe AppError. */
export function toAppError(e: unknown): AppError {
  if (e instanceof z.ZodError) {
    const detail = e.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return { code: "VALIDATION", message: detail };
  }
  if (e instanceof CodedError) {
    return { code: e.code, message: e.message };
  }
  if (e instanceof Error) {
    return { code: "INTERNAL", message: e.message };
  }
  return { code: "UNKNOWN", message: String(e) };
}
