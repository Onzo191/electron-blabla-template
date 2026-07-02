# Security guidance for myVNG Agent Desktop (Electron)

Threat model: desktop client holding API tokens for an agentic backend;
renderer displays model/tool output (untrusted content); IPC bridges the
privilege boundary between the sandboxed renderer and the Node main process.

Review every change against these rules:

- BrowserWindow security flags are invariants: `contextIsolation: true`,
  `sandbox: true`, `nodeIntegration: false`. Flag ANY change that weakens
  them, disables `webSecurity`, or enables `allowRunningInsecureContent`.
- Every IPC handler in `apps/desktop/src/main/ipc/` must validate its input
  with the Zod schema from `packages/shared/src/ipc-contract.ts` before use.
  Flag handlers that trust renderer input, and any renderer/preload code that
  calls `ipcRenderer` with a raw string channel outside the typed contract.
- Auth tokens live only in safeStorage (main process) and renderer memory.
  Flag tokens written to localStorage/sessionStorage/IndexedDB, plain files,
  electron-store, logs, or Sentry breadcrumbs.
- `shell.openExternal` must only receive URLs validated against an https
  allowlist — never a value derived from backend/model output.
- Navigation must stay locked down: windows need a `will-navigate` guard and
  `setWindowOpenHandler` that denies unknown targets; flag any `<webview>`,
  `executeJavaScript` with dynamic input, or loosening of the CSP in
  `index.html` (no `unsafe-inline`/`unsafe-eval`, no wildcard sources).
- Backend/model output rendered in chat is untrusted: markdown rendering
  must not pass through raw HTML (`dangerouslySetInnerHTML`, `rehype-raw`)
  without sanitization; tool-call output is displayed as data, never
  executed or interpolated into shell commands.
- The main process must not build shell commands or file paths from
  renderer-supplied or backend-supplied strings without validation
  (command injection / path traversal across the IPC boundary).
- Auto-updater: feed URLs are https-only and signature verification is never
  disabled; flag changes to updater config or `asar` integrity settings.
- Do not log message content, tokens, or `customer`/account identifiers at
  INFO level or above; scrub them from error reports before Sentry capture.
