import type { UpdaterService } from "../services/updater";
import { registerHandler } from "./register";

/** Not registered at all for mas/appx store builds — see isStoreBuild(). */
export function registerUpdateHandlers(service: UpdaterService): void {
  registerHandler("app:checkForUpdates", () => service.checkForUpdates());
  registerHandler("app:getUpdateStatus", () => service.getStatus());
  registerHandler("app:downloadUpdate", () => service.downloadUpdate());
  registerHandler("app:quitAndInstall", () => {
    service.quitAndInstall();
    return { started: true as const };
  });
}
