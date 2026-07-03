# Implementation Plan — Agent Desktop App (Electron)

> Cross-platform desktop client (Mac + Windows) acting as the frontend for an
> existing agentic backend system.
> Stack: Electron + React 19 + TypeScript + TanStack + Zustand.
> Should use the latest/stable version of electron, another stack
> Node 24 + pnpm 10. Optimized for pair-programming with Claude Code.

---

## 1. Goals & Scope

**Goals:**

- Cross-platform desktop app serving as the FE for an already-built agentic
  backend.
- Clean, feature-based architecture that's easy to maintain and scale across
  a team.
- Optimized for performance (smooth streaming, no lag on long conversations),
  with proper error handling, centralized logging, and a 3-tier test strategy.
- A repo designed so Claude Code can work efficiently and with minimal token
  waste.

**Out of scope (initial phase):** web version, mobile, offline-first sync,
plugin system.

---

## 2. Stack Decisions

### 2.1 Platform & Tooling

| Layer           | Choice                                | Why                                                            |
| --------------- | ------------------------------------- | -------------------------------------------------------------- |
| Shell           | Electron (latest LTS)                 | Cross-platform, mature ecosystem                               |
| Build           | electron-vite                         | Fast HMR across main/preload/renderer, simple config           |
| Language        | TypeScript strict                     | Required for maintainability; helps Claude self-verify via tsc |
| UI              | React 19                              |                                                                |
| Router          | TanStack Router                       | Type-safe routing                                              |
| Server state    | TanStack Query v5                     | Caching/retry/invalidation for all BE calls                    |
| Client state    | Zustand (slice pattern + devtools)    | UI state, transient streaming state                            |
| Styling         | Tailwind CSS v4 + Chakra UI v3        | Chakra provides accessible interactive components; Tailwind owns layout/utility styling |
| Package manager | pnpm 10 + workspaces                  | Monorepo, fast, workspace protocol                             |
| Runtime         | Node 24 (pinned via .nvmrc + engines) |                                                                |
| Packaging       | electron-builder + electron-updater   | Auto-update, signing, notarization                             |

### 2.2 Quality & Operations

| Area             | Choice                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| Unit/integration | Vitest + React Testing Library                                         |
| API mocking      | MSW (can mock SSE too)                                                 |
| E2E              | Playwright (official Electron support)                                 |
| Lint/format      | Biome (one tool instead of ESLint + Prettier)                          |
| Logging          | electron-log (main) + renderer log bridge via IPC                      |
| Error tracking   | Sentry `@sentry/electron` (main + renderer)                            |
| Validation       | Zod — every IPC payload and BE response                                |
| CI               | GitHub Actions: check (lint + typecheck + test) + build matrix mac/win |

### 2.3 Node 24 + pnpm 10 — Required Configuration

**Use pnpm 10** (not plain npm) because: workspace protocol works better for
monorepos, installs are 2–3x faster (Claude Code runs install/test
repeatedly), and hoisting control is better.

```ini
# .npmrc (root) — electron-builder doesn't like pnpm's symlinked store
node-linker=hoisted
shamefully-hoist=true
public-hoist-pattern[]=*electron*
```

```jsonc
// package.json (root)
{
  "packageManager": "pnpm@10.0.0", // use latest stable @10 version
  "engines": { "node": ">=24" },
}
```

```
# .nvmrc
24
```

---

## 3. Overall Architecture

### 3.1 Three Processes + Typed IPC Contract

```
┌─────────────────────────────────────────────┐
│ Main process (Node)                         │
│  - Window lifecycle, tray, menu, deep links │
│  - Auto-update, secure storage (safeStorage │
│    for API tokens)                          │
│  - Centralized logging, crash handling      │
└──────────────┬──────────────────────────────┘
               │ IPC (typed contract, Zod-validated)
┌──────────────┴──────────────────────────────┐
│ Preload (contextBridge)                     │
│  - Exposes a minimal API: window.api.*      │
└──────────────┬──────────────────────────────┘
┌──────────────┴──────────────────────────────┐
│ Renderer (React SPA)                        │
│  - TanStack Query calls the BE (REST/SSE)   │
│  - Zustand for UI/transient state           │
│  - Chat UI, streaming rendering             │
└─────────────────────────────────────────────┘
```

### 3.2 Core Architectural Decisions (ADR summary)

1. **The renderer calls the BE directly over HTTPS/SSE**, like a regular web
   app. The main process only handles what genuinely requires native access:
   safeStorage, auto-update, notifications, filesystem. → Most of the code is
   plain "web code": easy to test, easy for Claude to work with, and
   reusable for a future web version.
2. **Typed IPC contract** in `packages/shared`: every channel is declared in
   one place with a Zod schema. Adding a channel without implementing it is
   a compile error. Payloads are validated at runtime.
3. **State split:** TanStack Query owns _persisted state_ (conversations,
   completed messages, agent config). Zustand owns _transient state_
   (in-flight streaming tokens, agent status, draft input, UI). Never copy
   Query data into Zustand.
4. **Streaming lives outside Query:** SSE tokens flow into a Zustand
   selector, so only the actively-typing bubble re-renders. The completed
   message is written back into the Query cache once done.
5. **Feature-based, not layer-based:** each feature owns its own
   components/hooks/api/store, exported via a single `index.ts`; features
   never import each other's internals.

### 3.3 Monorepo Structure

```
my-agent-app/
├── CLAUDE.md                    # Claude Code conventions (< 150 lines)
├── .claude/
│   ├── settings.json            # hooks config
│   ├── rules/                   # path-scoped rules
│   ├── skills/                  # project skills
│   └── hooks/                   # shell scripts used by hooks
├── .npmrc  .nvmrc  biome.json  tsconfig.base.json
├── package.json                 # pnpm workspace root + standard scripts
├── docs/
│   ├── architecture.md  streaming.md  security.md  testing.md
│   └── adr/
├── packages/
│   └── shared/                  # ⭐ the heart of type-safety
│       └── src/
│           ├── ipc-contract.ts  # channels + Zod schemas
│           ├── api-types.ts     # agentic BE types (or generated from OpenAPI)
│           └── domain/          # Message, Conversation, Agent, ToolCall...
└── apps/
    └── desktop/
        ├── electron.vite.config.ts
        ├── src/
        │   ├── main/
        │   │   ├── index.ts
        │   │   ├── windows/     # window manager + state persistence
        │   │   ├── ipc/         # handlers registered against the contract
        │   │   ├── services/    # updater, secureStore, logger
        │   │   └── lib/
        │   ├── preload/index.ts # contextBridge only, keep it thin
        │   └── renderer/
        │       ├── app/         # providers, router, layout
        │       ├── features/
        │       │   ├── chat/    # components/ hooks/ api/ store/ index.ts
        │       │   ├── conversations/
        │       │   ├── agents/
        │       │   ├── settings/
        │       │   └── auth/
        │       ├── shared/      # shared components, lib (api-client, sse), utils
        │       └── main.tsx
        └── tests/e2e/           # Playwright
```

### 3.4 Standard Scripts (contract for both the team and Claude Code)

```jsonc
{
  "scripts": {
    "dev": "pnpm --filter desktop dev",
    "typecheck": "pnpm -r typecheck",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "test": "pnpm -r test",
    "test:e2e": "pnpm --filter desktop test:e2e",
    "build": "pnpm -r build",
    "check": "pnpm typecheck && pnpm lint && pnpm test",
  },
}
```

---

## 4. Phased Plan (4–5 weeks, 1–2 devs + Claude Code)

### Phase 0 — Bootstrap & Tooling (1–2 days)

- [ ] Init pnpm monorepo: root + `packages/shared` + `apps/desktop`
- [ ] Scaffold `apps/desktop` with the electron-vite react-ts template
- [ ] `.npmrc` hoisted + pin `packageManager` + `.nvmrc` = 24
- [ ] `tsconfig.base.json` strict (`strict`, `noUncheckedIndexedAccess`,
      `verbatimModuleSyntax`), packages extend it
- [ ] Biome config + standard root scripts
- [ ] Set up `.claude/` right away: CLAUDE.md + hooks + first skill (see
      Section 5)
- [ ] CI skeleton: GitHub Actions running `pnpm check` on push
- **DoD:** `pnpm dev` opens an Electron window; `pnpm check` passes; Claude
  Code can run every command listed in CLAUDE.md.

### Phase 1 — Electron Shell + Typed IPC (3–4 days)

- [ ] Window manager: create/restore, persist position + size
- [ ] Security baseline: `contextIsolation: true`, `sandbox: true`,
      `nodeIntegration: false`, CSP in index.html
- [ ] `packages/shared/src/ipc-contract.ts` + generic `registerHandler`
      (main) + generic `invoke` (preload)
- [ ] Main services: `secureStore` (safeStorage), `logger` (electron-log +
      renderer bridge), `appInfo`
- [ ] First test: Vitest for contract validation
- **DoD:** adding a new IPC channel only requires editing the contract →
  the handler → the call site; forgetting the handler is a compile error.

### Phase 2 — Renderer Foundation (3–5 days)

- [ ] TanStack Router: shell layout (sidebar + main pane); routes `/`,
      `/chat/$conversationId`, `/settings`, `/agents`
- [ ] QueryClient: default staleTime, retry policy, global error handler
- [ ] Root Zustand store + slice pattern; first slice is `uiSlice`
      (sidebar, theme)
- [ ] Tailwind v4 + Chakra UI provider/theme + base components (Button,
      Input, Dialog, Menu, Tooltip), shared design tokens wired into both
      (see `docs/ui-guidelines.md`)
- [ ] `shared/lib/api-client.ts`: fetch wrapper + Zod parsing + error
      normalization (`AppError { code, message, cause }`)
- [ ] MSW setup for dev + test
- **DoD:** the app shell is complete and navigable, mock data renders
  through Query.

### Phase 3 — Auth + Connecting to the Agentic BE (2–3 days)

- [ ] Login flow per your BE (API key / OAuth / SSO); token goes through
      IPC down to safeStorage, renderer only holds it in memory
- [ ] `useAuth` hook + route guard (TanStack Router's `beforeLoad`)
- [ ] BE health check + connection status indicator
- [ ] Full API type set as Zod schemas in
      `packages/shared/src/api-types.ts` (if the BE has an OpenAPI spec,
      generate with openapi-zod-client)
- **DoD:** login succeeds, the token is stored securely, the app knows its
  BE connection state.

### Phase 4 — Chat Streaming Core (5–7 days, the heaviest part)

- [ ] Conversations list (Query, infinite query if needed)
- [ ] Message list using `@tanstack/react-virtual`
- [ ] SSE client `shared/lib/sse.ts`: parses event types (`token`,
      `tool_call`, `tool_result`, `done`, `error`), reconnect logic,
      AbortController
- [ ] `chatSlice`: `streamingMessage`, `agentStatus` (thinking / calling
      tool X / idle), `draft`
- [ ] `useSendMessage` mutation: optimistic user message → stream tokens
      into Zustand → `onDone` writes the finished message back to the
      Query cache
- [ ] Markdown renderer: react-markdown + syntax highlighting, memoized
      per block (only the last block re-renders while streaming)
- [ ] Tool-call UI: collapsible card (tool name, input, output)
- [ ] Error/retry UX: failed messages get a retry button; a dropped stream
      either resumes or shows a clear error
- **DoD:** sending a message streams tokens smoothly → tool calls render →
  the finished message lands in the Query cache → history survives a
  reload.

### Phase 5 — Quality (in parallel from Phase 2, finalized here)

- [ ] Vitest: store slices, SSE parser, api-client, utils — logic coverage
      ≥ 80%
- [ ] RTL + MSW: ChatInput, MessageList, main flows
- [ ] Playwright Electron: 5–7 golden E2E paths (launch, login, send +
      stream, switch conversation, settings)
- [ ] Sentry for main + renderer, source maps, release tagging
- [ ] Per-feature Error Boundaries + fallback UI
- [ ] Main process: `uncaughtException` → log → dialog → graceful restart
- **DoD:** `pnpm check` is a trustworthy gate; any crash shows up in
  Sentry + the log file.

### Phase 6 — Packaging & Release (3–4 days)

- [ ] electron-builder: mac (dmg + zip, notarized) + win (nsis), asar
      enabled
- [ ] Code signing: Apple Developer ID + notarization; Windows cert (or
      Azure Trusted Signing)
- [ ] electron-updater: latest/beta channels + update notification UI
- [ ] GitHub Actions release workflow: tag → build matrix mac/win → sign →
      publish draft release
- [ ] Smoke-test the real build on both OSes
- **DoD:** installs cleanly from the installer on a clean machine on both
  OSes; auto-update works.

---

## 5. Claude Code Setup

Four mechanisms, split by context cost and how deterministic they are:

| Mechanism                       | Use for                                                                        | Token cost                                     |
| ------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| CLAUDE.md                       | Always-needed context: structure, commands, hard rules                         | Loaded every session — must stay short         |
| Rules (`.claude/rules/`)        | Path-scoped rules (main vs renderer vs tests)                                  | Loaded when a matching file is touched         |
| Skills (`.claude/skills/`)      | Repeatable workflows (add a feature, add an IPC channel, release)              | Loaded only when invoked — cheapest            |
| Hooks (`.claude/settings.json`) | Things that MUST happen: formatting, typechecking, blocking dangerous commands | ~0 token (runs outside context, deterministic) |

### 5.1 CLAUDE.md (keep under 150 lines, mostly pointers to docs)

```markdown
# Agent Desktop App

Electron desktop client for the agentic system. pnpm monorepo.

## Commands

- `pnpm dev` — run the app in dev mode (electron-vite HMR)
- `pnpm check` — typecheck + lint + test (RUN BEFORE ENDING ANY TASK)
- `pnpm test -- <pattern>` — run a specific test
- `pnpm --filter desktop test:e2e` — Playwright (only when explicitly asked)

## Structure

- `packages/shared/` — IPC contract, API types, domain types. EDIT THE
  CONTRACT HERE FIRST.
- `apps/desktop/src/main/` — Node only. Never import from renderer.
- `apps/desktop/src/preload/` — contextBridge only, keep it thin.
- `apps/desktop/src/renderer/features/<name>/` — each feature owns its
  components/hooks/api/store, exported via index.ts. DO NOT import across
  feature internals.

## Hard rules

- IPC: every channel must be declared in
  packages/shared/src/ipc-contract.ts with a Zod schema. Never call
  ipcRenderer.invoke with a raw string.
- State: TanStack Query for BE data. Zustand for UI/transient state.
  Never copy Query data into Zustand.
- Every BE response and IPC payload must be parsed through Zod.
- Renderer never touches Node APIs. Main never touches the DOM.
- No `any`. No default exports (except route files).

## Docs (read on demand, don't preload)

- Adding an IPC channel: skill /add-ipc-channel
- Adding a new feature: skill /add-feature
- Architecture: docs/architecture.md · Streaming: docs/streaming.md
- Electron security: docs/security.md
```

Maintenance rule: for every line, ask "would Claude get this wrong without
it?" — if not, delete it. Add a rule whenever Claude repeats a mistake;
trim rules it never violates.

### 5.2 Rules — `.claude/rules/`

| File                | Applies to                     | Main content                                                                                                             |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `main-process.md`   | `apps/desktop/src/main/**`     | use electron-log instead of console; IPC handlers must try/catch and return AppError; never block the main thread > 50ms |
| `renderer.md`       | `apps/desktop/src/renderer/**` | function declarations for components; hooks named `use*`; query keys come from a factory in `features/*/api/keys.ts`     |
| `tests.md`          | `**/*.test.ts(x)`              | Vitest + RTL; mock the BE with MSW; test stores as vanilla stores                                                        |
| `shared-package.md` | `packages/shared/**`           | types + Zod schemas + pure functions only; never import electron/react                                                   |
| `ui.md`             | renderer components/styles     | Chakra for interactive components, Tailwind for layout/spacing; one styling system per element; tokens defined once     |

### 5.3 Skills to Write — `.claude/skills/<name>/SKILL.md`

Write descriptions as targeting instructions (specific enough about
file/path/context to auto-invoke at the right time).

**Required (Phase 0–1):**

1. `add-ipc-channel` — 4 steps: schema in the contract → handler in
   main/ipc → call via window.api → test. Includes one complete sample
   channel.
2. `add-feature` — scaffolds the standard feature folder, the query key
   factory convention, when a dedicated Zustand slice is warranted, and a
   completion checklist.
3. `review-electron-security` — checklist: contextIsolation, CSP,
   openExternal validation, no tokens in renderer storage, IPC input
   validation.
4. `build-ui` — the Tailwind + Chakra split: which library owns what,
   theme/token setup, dark mode, and a sample component.

**Nice to have (Phase 2–4):** 5. `add-query` — the standard pattern for a new query/mutation: key
factory, Zod parsing, error handling, invalidation. 6. `streaming-patterns` — your BE's SSE event spec, the Zustand-vs-Query
split during streaming, how to test streams with MSW. 7. `write-tests` — conventions per test type (store/hook/component/E2E) +
templates.

**Release (Phase 6):** 8. `release` — bump version → changelog → tag → CI build → verify
notarization → publish.

**Community add-ons:** open-source skill/hook bundles (e.g. Dave's Claude
Code Skills — copy into `.claude/skills/`) are worth pulling from for
security hooks (blocking secrets from landing in the repo) and an ADR
skill. Beyond that, prefer writing your own — a skill that encodes your
project's own conventions is worth more than a generic one.

### 5.4 Hooks — `.claude/settings.json`

```jsonc
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/check-file.sh",
          },
        ],
        // runs: biome check --write <file> + incremental tsc --noEmit for
        // the package containing that file; failure → exit 2 with a
        // message → Claude fixes it right away
      },
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-bash.sh",
          },
        ],
        // blocks: rm -rf outside the repo, git push --force, npm install
        // (pnpm is required), writes to .env*
      },
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/final-check.sh",
          },
        ],
        // runs a quick pnpm typecheck; failure → exit 2 so Claude can't
        // end the task with broken code
      },
    ],
  },
}
```

Keep hooks fast (< 1–2s, only check the file(s) that changed) so they don't
slow down the feedback loop.

### 5.5 Docs — Progressive Disclosure

```
docs/
├── architecture.md   # the 3 processes, data flow, decisions + rationale
├── streaming.md       # SSE event spec, sequence diagrams, edge cases
├── security.md        # Electron checklist + threat model
├── testing.md          # test strategy, how to mock SSE
└── adr/                # 001-pnpm-hoisted.md, 002-renderer-calls-be-directly.md, ...
```

CLAUDE.md only points to these docs — Claude only reads streaming.md when
it's working on a streaming task. This is the single biggest token saver.

### 5.6 Token-Optimization Tactics While Working

1. **Narrow tasks, clean endings:** each session should tackle one clear
   task; run `/clear` when done — stale context is wasted tokens.
2. **Proactive `/compact`** at natural breakpoints before the context
   fills up.
3. **Plan mode for big tasks:** review the plan before execution to avoid
   throwaway code.
4. **Subagents for wide reads:** "find every place pattern X is used" goes
   to a subagent — it reads dozens of files in its own context and returns
   a summary.
5. **Tests are the cheapest verifier:** let Claude run
   `pnpm test -- <pattern>` to verify its own work instead of describing
   bugs back to it in prose.
6. **Review and prune** CLAUDE.md and skills periodically.

---

## 6. Model Selection Strategy (Claude Code)

Principle: **use your strongest model for hard-to-reverse decisions, and a
cheaper model for repetitive work.** Switch mid-session with `/model`.

| Type of work                                                                                        | Model                                                      | Examples in this project                                         |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| Architecture, boilerplate scaffolding, IPC contract design, security review, hard debugging         | **Your strongest available model**                         | All of Phase 0–1, designing the SSE layer, ADR decisions         |
| Implementing features against an established pattern, writing tests, small refactors, UI components | **Sonnet** (daily default)                                 | Phase 2–5: adding features, writing queries/mutations, Chakra UI |
| Mechanical work: renames, formatting, doc updates, repetitive boilerplate generation                | **Haiku** (or just stay on Sonnet if cost isn't a concern) | Changelog updates, bulk typo fixes                               |

Practical rules of thumb:

- **Plan with the strongest model, execute with Sonnet:** use plan mode
  with your strongest model to produce a detailed plan, review it, then
  switch to Sonnet to execute — similar quality, much lower cost.
- The initial boilerplate (Section 7) is worth building with your
  strongest model: everything afterward copies its patterns, so mistakes
  here propagate everywhere.
- If Sonnet is stuck on the same bug after 2–3 attempts, switch up instead
  of burning more iterations.
- Check current model names and lineup in the docs, since these change:
  https://docs.claude.com

---

## 7. Boilerplate/Template Checklist (Immediate Next Step)

Goal: 2–3 days to a running template where every standard pattern has at
least one working example — so all future code (human or Claude-written)
just copies the pattern.

### Step 1 — Environment (30 minutes)

- [ ] Install Node 24 (nvm/fnm), `corepack enable`, pnpm 10
- [ ] Install Claude Code, sign in
- [ ] Create the Git repo + branch protection on `main`

### Step 2 — Monorepo Skeleton (strongest model, plan mode)

- [ ] Prompt Claude Code (plan mode): "Scaffold a monorepo following the
      structure in Section 3.3, using the electron-vite react-ts template
      for apps/desktop, and an empty packages/shared with its own
      tsconfig"
- [ ] `.npmrc` hoisted + `packageManager` + `.nvmrc` + `engines`
- [ ] `tsconfig.base.json` strict + Biome + standard scripts (Section 3.4)
- [ ] Verify: `pnpm install` is clean, `pnpm dev` opens a window, `pnpm
    check` passes

### Step 3 — Claude Code Setup (before writing real feature code)

- [ ] CLAUDE.md following the template in 5.1
- [ ] `.claude/settings.json` + 3 hook scripts (check-file, guard-bash,
      final-check)
- [ ] `.claude/rules/` — 5 files (Section 5.2)
- [ ] Skill `add-ipc-channel` (write this first — you can use Claude
      Code's built-in skill-creator skill)
- [ ] `docs/architecture.md` + `docs/adr/001`, `002` (transcribe the
      decisions from this plan)
- [ ] Loop test: have Claude edit a file → confirm the hook formats +
      typechecks it → Claude sees and fixes any resulting error

### Step 4 — Complete Typed IPC Layer (strongest model)

- [ ] `ipc-contract.ts` + generic `registerHandler` + generic `invoke`
      (preload)
- [ ] 2 sample channels: `app:getVersion` (simple) + `auth:setToken` /
      `auth:getToken` (uses safeStorage)
- [ ] Vitest for the contract + handlers
- [ ] This is **sample pattern #1** — every future channel copies from it

### Step 5 — Renderer Foundation with One Example per Pattern

- [ ] Router + shell layout + 3 routes
- [ ] QueryClient + one complete sample query (key factory → fetch → Zod
      parse → component consuming it) running against MSW
- [ ] Zustand store + a sample `uiSlice` + one slice test
- [ ] Tailwind + Chakra UI provider, base components + dark mode
- [ ] One sample RTL component test
- [ ] This is **sample pattern #2, #3, #4** (query, slice, component test)

### Step 6 — Quality Scaffolding

- [ ] electron-log + renderer log bridge
- [ ] Error Boundary + `AppError`
- [ ] Playwright: one sample E2E (launch the app, see the layout)
- [ ] GitHub Actions: `check` workflow + build matrix workflow (signing
      not needed yet)

### Step 7 — Package the Template

- [ ] README: setup, structure, "how to add a feature/IPC channel/query"
      (pointing to skills)
- [ ] Tag `v0.1.0-template` or split it into its own template repo
- [ ] **Final acceptance test:** a new person (or a fresh Claude Code
      session with clean context) can add one IPC channel + one small
      feature just by reading CLAUDE.md and the skills, without asking
      anyone for help

### After the template → move into Phase 3 (auth + BE) then Phase 4 (chat streaming) per Section 4.

---

## 8. Risks & Notes

| Risk                                      | Mitigation                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| pnpm's symlinks break electron-builder    | Hoisted `.npmrc` from day one (Section 2.3); test a real build as early as Phase 1                                  |
| macOS notarization issues                 | Set up an Apple Developer ID early; test notarization by mid-Phase 5                                                |
| BE's SSE spec changes                     | All event types live in the shared Zod schema — one edit surfaces every affected call site as a compile error       |
| Long conversations causing lag            | Virtualization + memoized markdown blocks are mandatory from the start of Phase 4, not deferred as "optimize later" |
| CLAUDE.md bloating, Claude ignoring rules | Review every two weeks, keep it under 150 lines, move detail into skills/docs                                       |
