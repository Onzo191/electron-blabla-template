type LogLevel = "error" | "warn" | "info" | "debug";

function formatMeta(meta: unknown): string {
  if (meta instanceof Error) return meta.stack ?? meta.message;
  if (typeof meta === "string") return meta;
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

function send(level: LogLevel, message: string, meta?: unknown): void {
  void window.api.invoke("log:write", {
    level,
    message,
    meta: meta === undefined ? undefined : formatMeta(meta),
  });
}

/** Bridges renderer logs into the main process's electron-log file over IPC. */
export const logger = {
  error: (message: string, meta?: unknown) => send("error", message, meta),
  warn: (message: string, meta?: unknown) => send("warn", message, meta),
  info: (message: string, meta?: unknown) => send("info", message, meta),
  debug: (message: string, meta?: unknown) => send("debug", message, meta),
};
