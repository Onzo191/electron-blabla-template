import { createSecureTokenStore } from "../services/secure-store";
import { registerAppHandlers } from "./app";
import { registerAuthHandlers } from "./auth";

/** Register every IPC handler declared in the shared contract. */
export function registerIpcHandlers(): void {
  registerAppHandlers();
  registerAuthHandlers(createSecureTokenStore());
}
