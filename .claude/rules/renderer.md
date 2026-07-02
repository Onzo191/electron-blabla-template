---
globs: apps/desktop/src/renderer/**
---

# Renderer rules

Applies to: `apps/desktop/src/renderer/**`

- Browser-only code. Never import `electron`, `node:*`, or anything from
  `src/main`. Reach the main process only via `window.api.*` (preload
  bridge), never `ipcRenderer` directly.
- Components are function declarations; hooks are named `use*`.
- Backend data goes through TanStack Query; query keys come from a factory
  in `features/<name>/api/keys.ts` — never inline key arrays.
- UI/transient state (streaming tokens, drafts, layout) lives in Zustand
  slices. Never copy Query data into Zustand.
- Parse every backend response with the Zod schemas from `@myvng/shared`
  before it enters the Query cache.
- Import from a feature only via its `index.ts`, never its internals.
