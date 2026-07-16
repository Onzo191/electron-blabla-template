import { invokeOrThrow } from "@renderer/shared/lib/ipc-client";

export function getAppVersion(): Promise<{
  version: string;
  platform: string;
}> {
  return invokeOrThrow("app:getVersion", undefined);
}
