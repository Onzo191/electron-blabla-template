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
`ipcRenderer.invoke` with a raw string anywhere. The generic plumbing
(`registerHandler`, preload `invoke`, envelopes) already exists — adding a
channel touches it ONLY if you're adding a new domain file.

Working examples to copy: `app:getVersion` (void request) and
`auth:setToken`/`auth:getToken` (payload + safeStorage service).

## 1. Declare the channel in the contract

`packages/shared/src/ipc-contract.ts` — add an entry to the `ipcContract`
map, named `domain:action`, with Zod request AND response schemas:

```ts
"app:getVersion": {
  request: z.void(),
  response: z.object({ version: z.string(), platform: z.string() }),
},
```

Inferred types (`IpcChannel`, `IpcRequest<C>`, `IpcResponse<C>`, `IpcInvoker`)
and the envelope types (`IpcResult<T>`, `AppError`, `toAppError`, `CodedError`
in `errors.ts`) update automatically. Everything is exported via the barrel.

## 2. Implement the handler in main

`apps/desktop/src/main/ipc/<domain>.ts` — register through the existing
generic `registerHandler` (`apps/desktop/src/main/ipc/register.ts`). It
Zod-parses the request BEFORE your handler runs, Zod-parses your return
value, and converts any thrown error into `{ ok: false, error: AppError }` —
so handlers just return the plain response shape and throw `CodedError`
for domain failures:

```ts
export function registerAuthHandlers(store: SecureTokenStore): void {
  registerHandler("auth:setToken", ({ token }) => {
    store.setToken(token); // throws CodedError("ENCRYPTION_UNAVAILABLE", ...) when unsafe
    return { saved: true as const };
  });
}
```

- New domain → create `ipc/<domain>.ts` and wire it in `ipc/index.ts`
  (`registerIpcHandlers`), which `main/index.ts` calls in `whenReady`.
- Native side-effects (fs, safeStorage, updater) live in a service under
  `main/services/` with injectable config (see `secure-store.ts`) so tests
  can point it at a temp dir.
- Fail secure: no plaintext fallbacks when a security capability is missing.

## 3. Call it from the renderer

No preload change needed — `window.api.invoke` is generic and typed from the
contract. Every call resolves to the envelope; unwrap it:

```ts
const result = await window.api.invoke("auth:getToken", undefined);
if (result.ok) use(result.data.token);
else showError(result.error); // { code, message }
```

## 4. Test it

- Contract (`packages/shared/src/ipc-contract.test.ts`): valid/invalid
  request and response per channel.
- Handler (colocated `apps/desktop/src/main/ipc/<domain>.test.ts`): copy the
  `vi.hoisted` + `vi.mock("electron")` pattern from `auth.test.ts` — capture
  the wrapped handler from the `ipcMain.handle` mock, invoke it directly,
  assert on envelopes (success, validation failure, domain error codes).

## Done checklist

- [ ] Channel in `ipc-contract.ts` with request AND response schemas
- [ ] Handler via `registerHandler`; domain errors thrown as `CodedError`
- [ ] No raw channel strings outside the contract file
- [ ] Contract + handler tests added
- [ ] `pnpm check` passes
