---
globs: apps/desktop/src/main/**
---

# Main process rules

Applies to: `apps/desktop/src/main/**`

- Node-only code. Never import React, DOM APIs, or anything from
  `src/renderer` or `src/preload`.
- Log with electron-log (the logger service), never `console.*`.
- Every IPC handler is registered against the contract in `@myvng/shared`,
  wraps its body in try/catch, and returns a typed `AppError` on failure —
  never let a raw exception cross IPC.
- Never block the main thread for more than ~50ms; heavy work goes async
  or into a worker.
- Tokens and secrets go through safeStorage (secureStore service) — never
  written to disk in plain text.
