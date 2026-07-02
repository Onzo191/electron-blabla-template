---
name: add-ipc-channel
description: >
  Add or change an IPC channel between the Electron main process and the
  renderer. Use whenever the renderer needs a new native capability
  (filesystem, safeStorage, updater, notifications, app info) or when
  editing packages/shared/src/ipc-contract.ts, apps/desktop/src/main/ipc/,
  or window.api usage. Enforces the contract-first Zod pattern.
---

# Add an IPC channel

Order is mandatory: contract → handler → call site → test. Never call
`ipcRenderer.invoke` with a raw string anywhere.

## 1. Declare the channel in the contract

Edit `packages/shared/src/ipc-contract.ts`. Every channel is an entry in the
single `ipcContract` map with a Zod request and response schema:

```ts
import { z } from "zod";

export const ipcContract = {
  "app:getVersion": {
    request: z.void(),
    response: z.object({ version: z.string(), platform: z.string() }),
  },
  // ← add the new channel here, namespaced "domain:action"
} as const;

export type IpcContract = typeof ipcContract;
export type IpcChannel = keyof IpcContract;
export type IpcRequest<C extends IpcChannel> = z.infer<IpcContract[C]["request"]>;
export type IpcResponse<C extends IpcChannel> = z.infer<IpcContract[C]["response"]>;
```

If `ipc-contract.ts` does not exist yet, create it with exactly this shape
plus the generic helpers below — this file is the single source of truth.

## 2. Implement the handler in main

In `apps/desktop/src/main/ipc/`, one file per domain, registered through the
generic `registerHandler` (which parses the request with the contract schema
before your code runs, and try/catches into `AppError`):

```ts
// apps/desktop/src/main/ipc/register.ts (generic — created once)
import { ipcMain } from "electron";
import { ipcContract, type IpcChannel, type IpcRequest, type IpcResponse } from "@myvng/shared";

export function registerHandler<C extends IpcChannel>(
  channel: C,
  handler: (req: IpcRequest<C>) => Promise<IpcResponse<C>>,
): void {
  ipcMain.handle(channel, async (_event, raw) => {
    const req = ipcContract[channel].request.parse(raw);
    return ipcContract[channel].response.parse(await handler(req as IpcRequest<C>));
  });
}
```

```ts
// apps/desktop/src/main/ipc/app.ts (example handler)
registerHandler("app:getVersion", async () => ({
  version: app.getVersion(),
  platform: process.platform,
}));
```

Register the domain file from `main/index.ts` if it's new. Handlers must not
throw raw errors across IPC — return/throw `AppError` shapes only.

## 3. Call it from the renderer

The preload exposes one generic `invoke` — adding a channel usually needs
NO preload change:

```ts
// apps/desktop/src/preload/index.ts (generic — created once)
const api = {
  invoke: <C extends IpcChannel>(channel: C, req: IpcRequest<C>) =>
    ipcRenderer.invoke(channel, req) as Promise<IpcResponse<C>>,
};
contextBridge.exposeInMainWorld("api", api);
```

Renderer call site (inside a feature's `api/` folder, wrapped in TanStack
Query if it's server-ish data):

```ts
const info = await window.api.invoke("app:getVersion", undefined);
```

## 4. Test it

- Contract test (`packages/shared`): schema round-trip — valid payload
  parses, invalid payload throws.
- Handler test (`apps/desktop`): call the handler function with a parsed
  request; assert the response matches `ipcContract[channel].response`.

## Done checklist

- [ ] Channel in `ipc-contract.ts` with request AND response schemas
- [ ] Handler registered via `registerHandler`, returns `AppError` on failure
- [ ] No raw channel strings outside the contract file
- [ ] `pnpm check` passes
