import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CodedError } from "@myvng/shared";
import { app, safeStorage } from "electron";

const TOKEN_FILE = "secure-token.bin";

export interface SecureTokenStore {
  setToken(token: string): void;
  getToken(): string | null;
  clearToken(): void;
}

/**
 * Persists a single token encrypted with the OS keychain via safeStorage.
 * Fail-secure: if OS-level encryption is unavailable, operations throw a
 * CodedError instead of falling back to plaintext.
 */
export function createSecureTokenStore(opts?: {
  dir?: string;
}): SecureTokenStore {
  const dir = opts?.dir ?? app.getPath("userData");
  const file = join(dir, TOKEN_FILE);

  function assertEncryptionAvailable(): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new CodedError(
        "ENCRYPTION_UNAVAILABLE",
        "OS-level encryption is unavailable; refusing to store the token in plaintext.",
      );
    }
  }

  return {
    setToken(token: string): void {
      assertEncryptionAvailable();
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, safeStorage.encryptString(token), { mode: 0o600 });
    },

    getToken(): string | null {
      let encrypted: Buffer;
      try {
        encrypted = readFileSync(file);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw e;
      }
      assertEncryptionAvailable();
      return safeStorage.decryptString(encrypted);
    },

    clearToken(): void {
      try {
        unlinkSync(file);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
    },
  };
}
