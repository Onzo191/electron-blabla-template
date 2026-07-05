import type { UpdateStatus } from "@myvng/shared";
import { invokeOrThrow } from "@renderer/shared/lib/ipc-client";

export function getUpdateStatus(): Promise<UpdateStatus> {
  return invokeOrThrow("app:getUpdateStatus", undefined);
}

export function checkForUpdates(): Promise<UpdateStatus> {
  return invokeOrThrow("app:checkForUpdates", undefined);
}

export function downloadUpdate(): Promise<UpdateStatus> {
  return invokeOrThrow("app:downloadUpdate", undefined);
}

export function quitAndInstall(): Promise<{ started: true }> {
  return invokeOrThrow("app:quitAndInstall", undefined);
}
