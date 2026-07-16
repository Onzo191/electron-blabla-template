import type { BrowserWindow } from "electron";
import { createSecureTokenStore } from "../services/secure-store";
import {
  createUpdaterService,
  isStoreBuild,
  startUpdateChecks,
} from "../services/updater";
import { registerAppHandlers } from "./app";
import { registerAuthHandlers } from "./auth";
import { registerLoggerHandlers } from "./logger";
import { registerUpdateHandlers } from "./update";
import { registerWindowHandlers } from "./window";

/**
 * Register every IPC handler declared in the shared contract. Returns a
 * disposer for the background update poll (no-op for store builds, which
 * never start one), so the caller can stop it on quit.
 */
export function registerIpcHandlers(
  getWindow: () => BrowserWindow | null,
): () => void {
  registerAppHandlers();
  registerAuthHandlers(createSecureTokenStore());
  registerLoggerHandlers();
  registerWindowHandlers(getWindow);

  // Store builds (mas/appx) update via their store — never wire the
  // direct-channel updater in for them (docs/release-cicd.md).
  if (isStoreBuild()) return () => {};

  const updaterService = createUpdaterService();
  registerUpdateHandlers(updaterService);
  return startUpdateChecks(updaterService);
}
