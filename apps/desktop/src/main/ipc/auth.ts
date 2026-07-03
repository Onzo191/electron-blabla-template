import type { SecureTokenStore } from "../services/secure-store";
import { registerHandler } from "./register";

export function registerAuthHandlers(store: SecureTokenStore): void {
  registerHandler("auth:setToken", ({ token }) => {
    store.setToken(token);
    return { saved: true as const };
  });

  registerHandler("auth:getToken", () => ({
    token: store.getToken(),
  }));
}
