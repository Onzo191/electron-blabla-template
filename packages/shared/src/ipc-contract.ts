import { z } from "zod";
import { updateStatusSchema } from "./domain/update";
import type { IpcResult } from "./errors";

/**
 * Single source of truth for every IPC channel between main and renderer.
 * Channel names are "domain:action". Both request and response are parsed
 * at runtime by the main process; never call ipcRenderer with a raw string.
 */
export const ipcContract = {
  "app:getVersion": {
    request: z.void(),
    response: z.object({
      version: z.string(),
      platform: z.string(),
    }),
  },
  "auth:setToken": {
    request: z.object({ token: z.string().min(1) }),
    response: z.object({ saved: z.literal(true) }),
  },
  "auth:getToken": {
    request: z.void(),
    response: z.object({ token: z.string().nullable() }),
  },
  "auth:clearToken": {
    request: z.void(),
    response: z.object({ cleared: z.literal(true) }),
  },
  "log:write": {
    request: z.object({
      level: z.enum(["error", "warn", "info", "debug"]),
      message: z.string().min(1),
      meta: z.string().optional(),
    }),
    response: z.object({ ok: z.literal(true) }),
  },
  // Direct-channel updater only (packaged mas/appx builds never register
  // these handlers — see apps/desktop/src/main/services/updater.ts).
  "app:checkForUpdates": {
    request: z.void(),
    response: updateStatusSchema,
  },
  "app:getUpdateStatus": {
    request: z.void(),
    response: updateStatusSchema,
  },
  "app:downloadUpdate": {
    request: z.void(),
    response: updateStatusSchema,
  },
  "app:quitAndInstall": {
    request: z.void(),
    response: z.object({ started: z.literal(true) }),
  },
  // Windows-only: keeps the frameless titlebar's caption-button overlay
  // (minimize/maximize/close) in sync with the renderer's resolved theme.
  // No-op on other platforms.
  "window:setTitleBarTheme": {
    request: z.object({ theme: z.enum(["light", "dark"]) }),
    response: z.object({ ok: z.literal(true) }),
  },
} as const;

export type IpcContract = typeof ipcContract;
export type IpcChannel = keyof IpcContract;
export type IpcRequest<C extends IpcChannel> = z.infer<
  IpcContract[C]["request"]
>;
export type IpcResponse<C extends IpcChannel> = z.infer<
  IpcContract[C]["response"]
>;

/**
 * Shape of the preload-exposed invoke function (window.api.invoke).
 * Declared here so both the preload implementation and the renderer's
 * Window typing derive from the contract.
 */
export type IpcInvoker = <C extends IpcChannel>(
  channel: C,
  request: IpcRequest<C>,
) => Promise<IpcResult<IpcResponse<C>>>;
