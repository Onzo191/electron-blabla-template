# Architecture

Electron desktop client (Mac + Windows) for the existing agentic backend.
Full phased plan: `agent-desktop-app-plan.md` (repo root).

## Three processes + typed IPC

```
┌─────────────────────────────────────────────┐
│ Main process (Node)                         │
│  window lifecycle · tray · deep links       │
│  auto-update · safeStorage (tokens)         │
│  electron-log · crash handling              │
└──────────────┬──────────────────────────────┘
               │ IPC — typed contract, Zod-validated both ways
┌──────────────┴──────────────────────────────┐
│ Preload (contextBridge)                     │
│  exposes ONE generic typed invoke: window.api│
└──────────────┬──────────────────────────────┘
┌──────────────┴──────────────────────────────┐
│ Renderer (React SPA)                        │
│  TanStack Query → backend (REST/SSE) direct │
│  Zustand → UI + transient streaming state   │
└─────────────────────────────────────────────┘
```

Security baseline (invariants, enforced by hooks + security-guidance
plugin): `contextIsolation: true`, `sandbox: true`, `nodeIntegration:
false`, strict CSP in index.html.

## Core decisions (ADR summary)

1. **Renderer calls the backend directly** over HTTPS/SSE like a web app.
   The main process handles only what needs native access: safeStorage,
   auto-update, notifications, filesystem. Most code stays plain web code —
   testable and reusable for a future web version.
2. **Typed IPC contract** in `packages/shared/src/ipc-contract.ts`: every
   channel declared once with Zod request/response schemas. Missing handler
   = compile error; payloads validated at runtime on both sides. Workflow:
   `/add-ipc-channel`.
3. **State split.** TanStack Query owns persisted/backend state
   (conversations, completed messages, agent config). Zustand owns transient
   state (in-flight streaming tokens, agent status, drafts, UI). Query data
   is never copied into Zustand.
4. **Streaming lives outside Query.** SSE tokens flow into a Zustand
   selector so only the actively-typing bubble re-renders; the completed
   message is written back into the Query cache once done. Markdown blocks
   are memoized per paragraph. (Virtualization via
   `@tanstack/react-virtual` is deferred — streaming dynamic heights and
   scroll-height-delta pagination fight virtualizers; see
   `docs/chat-feature.md`.)
5. **Feature-based renderer.** Each feature under
   `renderer/src/features/<name>/` owns its components/hooks/api/store and
   exports through a single `index.ts`; no cross-feature internal imports.
   Workflow: `/add-feature`.

## Data flow: sending a message (implemented — see docs/chat-feature.md)

optimistic user bubble from `chatSlice` → POST `/v2/api/messages/ask`
(SSE over fetch + ReadableStream, slice-owned AbortController) →
`{response}` fragments drain through a rAF token queue into
`chatSlice.streamedText` → `{reasoning}` fills the reasoning accordion,
`{type:"tool_status"}` shows a live indicator → `data: [DONE]` writes the
completed exchange into the Query cache (`["messages", conversationId]`)
and resets the slice → `{error}`/drop shows an inline retry block. A new
conversation's `{type:"conversation"}` event seeds the messages cache and
redirects to `/chat/$conversationId` without interrupting the stream.

The renderer chat UI is feature-split: `features/agents` (picker,
greeting, prompt topics), `features/conversations` (sidebar lists + CRUD),
`features/chat` (messages, streaming, widget pipeline). i18n:
react-i18next, `vi` + `en`, strings generated from the product spec.

## Monorepo

```
packages/shared/      ipc-contract.ts · api-types.ts · domain/   (pure TS + Zod)
apps/desktop/src/     main/ (windows, ipc, services) · preload/ · renderer/
apps/desktop/tests/   unit/ (Vitest) · e2e/ (Playwright _electron)
```

Tooling: electron-vite build, Biome lint/format, TypeScript strict
(tsconfig.base.json), pnpm 10 workspaces with hoisted node-linker
(electron-builder compatibility), Node 24.

Errors: everything user-facing normalizes to
`AppError { code, message, cause }`; per-feature Error Boundaries;
`uncaughtException` in main → log → dialog → graceful restart; Sentry in
both processes.
