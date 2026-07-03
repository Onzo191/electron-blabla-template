import { logger } from "../services/logger";
import { registerHandler } from "./register";

export function registerLoggerHandlers(): void {
  registerHandler("log:write", ({ level, message, meta }) => {
    logger[level](
      meta ? `[renderer] ${message} ${meta}` : `[renderer] ${message}`,
    );
    return { ok: true as const };
  });
}
