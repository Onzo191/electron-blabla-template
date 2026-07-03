import { app } from "electron";
import { registerHandler } from "./register";

export function registerAppHandlers(): void {
  registerHandler("app:getVersion", () => ({
    version: app.getVersion(),
    platform: process.platform,
  }));
}
