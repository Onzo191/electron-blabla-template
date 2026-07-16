# myVNG Agent Desktop

Electron desktop client (Mac + Windows) for the existing agentic backend.
pnpm monorepo. Stack: Electron + electron-vite, React 19, TypeScript strict,
TanStack Router/Query, Zustand, Tailwind v4 + Chakra UI v3, Biome, Vitest,
Playwright. Node 24, pnpm 10 only (npm/yarn are blocked by hooks).

## Commands

- `pnpm dev` — run the app in dev mode (electron-vite HMR)
- `pnpm check` — typecheck + lint + test. RUN BEFORE ENDING ANY TASK.
- `pnpm typecheck` — tsc for every package
- `pnpm lint` / `pnpm lint:fix` — Biome
- `pnpm test` — all unit tests; `pnpm --filter desktop test -- <pattern>`
  or `pnpm --filter @myvng/shared test` for a subset
- `pnpm test:e2e` — Playwright Electron (slow; only when explicitly asked)
- `pnpm build` — production build of every package

## Structure

- `packages/shared/` — the heart of type-safety: IPC contract
  (`src/ipc-contract.ts`), API types, domain types. Pure TS + Zod only.
  WHEN ADDING/CHANGING AN IPC CHANNEL, EDIT THE CONTRACT HERE FIRST.
- `apps/desktop/src/main/` — Electron main process. Node only: window
  lifecycle, IPC handlers, updater, secureStore (safeStorage), logging.
- `apps/desktop/src/preload/` — contextBridge only; exposes `window.api.*`.
  Keep it thin.
- `apps/desktop/src/renderer/` — React SPA. Feature-based:
  `src/features/<name>/` owns its components/hooks/api/store and exports
  via a single `index.ts`. Features never import each other's internals.
- `apps/desktop/tests/` — `unit/` (Vitest) and `e2e/` (Playwright).

## Hard rules

- **IPC:** every channel must be declared in
  `packages/shared/src/ipc-contract.ts` with a Zod schema. Never call
  `ipcRenderer.invoke` with a raw string.
- **State:** TanStack Query owns backend data (conversations, messages,
  agent config). Zustand owns UI/transient state (streaming tokens, drafts,
  layout). Never mix the two — never copy Query data into Zustand.
- **Validation:** every backend response and every IPC payload must be
  parsed through Zod before use.
- **Process boundary:** the renderer never touches Node APIs; the main
  process never touches the DOM.
- **TypeScript:** no `any`. No default exports, except route files.

## Style

- Be concise in responses: skip preamble, recap, and restating the diff.

## Docs & skills (read on demand — don't preload)

- Architecture, data flow, ADRs: `docs/architecture.md`
- UI stack (Chakra-vs-Tailwind split, tokens, dark mode):
  `docs/ui-guidelines.md`
- Design system (color/type/spacing/radius/shadow/motion tokens, accent
  theming, golden-ratio layout guidance): `docs/design-system.md`
- Chat feature (streaming lifecycle, chatSlice, widget pipeline, query/
  invalidation matrix, error taxonomy, i18n): `docs/chat-feature.md`;
  product spec in `docs/ai-agents-spec/`
- Release/CI/CD: self-hosted GitLab pipeline, store vs. direct-download
  channels, code signing, forced-update policy: `docs/release-cicd.md`
- Release runbook: environments/accounts to provision, store submission
  steps, update-automation flow, version-policy service decision:
  `docs/release-runbook.md`
- Third-party skill policy & compression rules: `docs/claude-code-skills.md`
- Project skills:
  - `/add-ipc-channel` — schema in contract → handler in main → call via
    `window.api` → test
  - `/add-feature` — scaffold a standard feature folder + checklist
  - `/build-ui` — build renderer UI with Chakra UI + Tailwind: ownership
    split, theme tokens, dark mode
  - `/write-tests` — per-layer test conventions incl. MSW v2 SSE mocking
    and Playwright `_electron` fixtures
  - `/review-electron-security` — deep Electron security audit
- Vendored security skills (manual-only, Trail of Bits):
  `/differential-review` (pre-merge on main/preload/IPC changes),
  `/insecure-defaults` (new config/env code), `/sharp-edges` (IPC contract
  surface changes)
- Always-on: security-guidance plugin (rules in
  `.claude/claude-security-guidance.md` + `.claude/security-patterns.json`)
