import { join } from "node:path";
import { app } from "electron";
import log from "electron-log/main";

let initialized = false;

/** Configures the single log file (main + renderer entries) used app-wide. */
export function initLogger(): void {
  if (initialized) return;
  initialized = true;

  log.transports.file.level = "info";
  log.transports.file.resolvePathFn = () =>
    join(app.getPath("userData"), "logs", "main.log");
  log.transports.console.level = app.isPackaged ? false : "debug";

  log.initialize();
}

export const logger = log;
