---
name: review-electron-security
description: >
  Deep Electron-specific security pass over this app. Use when asked to
  review security, before a release, after changes to BrowserWindow options,
  preload, CSP, IPC handlers, auth/token handling, or the auto-updater.
  Complements the always-on security-guidance plugin (which pattern-matches
  edits) with a full manual audit.
---

# Electron security review

Work through every section; report findings as CRITICAL / HIGH / MEDIUM /
LOW with file:line and a concrete fix. Absence of a section's code (e.g. no
updater yet) is reported as "n/a", not skipped silently.

## 1. Process & window hardening

- Every `new BrowserWindow`: `contextIsolation: true`, `sandbox: true`,
  `nodeIntegration: false`, `webSecurity` not disabled, no
  `allowRunningInsecureContent`, `webviewTag` not enabled.
- `app.enableSandbox()` considered globally.
- Grep for overrides: `nodeIntegration`, `contextIsolation`, `sandbox:`,
  `webSecurity`, `webviewTag`, `nodeIntegrationInWorker`.

## 2. Navigation & external content

- `will-navigate` handler denies navigation away from the app origin.
- `setWindowOpenHandler` denies or strictly allowlists new windows.
- `shell.openExternal` only behind an https allowlist validator; trace every
  call site's input back to its source — backend/model-derived URLs are
  untrusted.
- `session.setPermissionRequestHandler` denies by default (camera, mic,
  geolocation, notifications as needed).

## 3. CSP & renderer content

- `index.html` CSP: no `unsafe-inline`/`unsafe-eval`, no `*` sources,
  `connect-src` limited to the backend origin(s).
- Markdown/chat rendering: no raw HTML pass-through (`rehype-raw`,
  `dangerouslySetInnerHTML`) without sanitization; tool-call output rendered
  as text/data only.

## 4. IPC surface

- Every channel exists in `packages/shared/src/ipc-contract.ts`; every
  handler parses its request through the contract schema BEFORE any logic.
- No raw-string `ipcRenderer` calls in renderer code; preload exposes only
  the generic typed `invoke` (no `ipcRenderer` itself, no Node objects).
- Handlers doing fs/shell/path work: check for path traversal and command
  injection from renderer- or backend-supplied strings.
- IPC senders validated where the handler is privileged
  (`senderFrame`/URL check for sensitive channels).

## 5. Secrets & storage

- Tokens only via safeStorage in main + memory in renderer. Grep renderer
  for `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`
  holding tokens/secrets.
- Nothing sensitive in electron-log output or Sentry events (check
  beforeSend scrubbing); no secrets in crash dumps or window titles.

## 6. Supply chain & packaging

- Auto-updater: https feed, signature verification on, no
  `allowDowngrade` without reason; asar integrity enabled where supported.
- `pnpm audit` for known vulns; flag any dependency that ships a preload or
  native module unexpectedly.
- Electron version: not EOL, no known unpatched CVEs for the pinned major.

## 7. Tooling cross-check

If available, run Doyensec's Electronegativity for a second opinion and
merge unique findings:

```bash
pnpm dlx @doyensec/electronegativity -i apps/desktop -o /tmp/electroneg.csv
```

Also run the built-in `/security-review` on the current diff if this review
was triggered by a change rather than a scheduled audit.
