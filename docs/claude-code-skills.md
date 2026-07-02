# Claude Code Skills — Evaluation & Adoption Policy

Researched 2026-07-02/03 against this project's stack (Electron + React 19 +
TypeScript strict + TanStack + Zustand, Zod-validated IPC, high security
requirements, long maintenance horizon). Re-evaluate quarterly with the same
diligence as an npm dependency. **Status 2026-07-03: §3.1 and §3.2 are set
up in this repo** (plugin enabled via checked-in settings; Trail of Bits
skills vendored). §3.3 remains deferred to Phase 4–5.

## 1. How skills actually cost tokens (corrected premise)

Verified against official docs (code.claude.com/docs/en/skills,
platform.claude.com Agent Skills overview, Anthropic engineering blog):

- At session start, only each installed skill's frontmatter `name` +
  `description` is loaded — **~100 tokens per skill**, capped at 1,536 chars
  per entry. The full SKILL.md body loads **only when invoked**, then stays
  in context for the rest of the session.
- A skill with `disable-model-invocation: true` costs **0 tokens** at
  session start — it is absent from context until explicitly invoked via
  `/name`. This is our default for adopted third-party skills.
- The skill listing shares a budget of 1% of the context window; past it,
  descriptions get truncated and rarely-used skills drop out — so a small,
  curated skill set still matters for reliable auto-triggering.

Consequence: the decisive criteria are **(a)** does it beat Claude Code
built-ins (`/code-review`, `/security-review`, `/verify`, `/run`),
**(b)** is the source repo trustworthy and maintained, and **(c)** does it
conflict with our own workflow skills — not baseline token bloat.

## 2. Evaluated skills

| Skill / source | Link | Verdict | Reasoning |
|---|---|---|---|
| caveman (output compression) | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | **Skip** | Compresses output tokens only (a minor share of Claude Code cost — input context dominates). Independent benchmark ([HN, 24 prompts](https://news.ycombinator.com/item?id=47954745)) found a plain "be brief" instruction achieves near-identical savings. Single maintainer, no commits since 2026-06-12 with ~355 open issues/PRs; always-on session hook via `curl\|bash` installer; `/caveman-compress` lossily rewrites CLAUDE.md; strips hedging *by design* — hostile to a security-sensitive project. See §4 policy. |
| security-guidance plugin (official Anthropic) | [docs](https://code.claude.com/docs/en/security-guidance) | **Adopt — always on** | Continuous 3-layer review: per-edit deterministic pattern match, end-of-turn diff review, agentic review on commit/push. Extensible per-project with our Electron threat model (§3.1). Near-zero token cost until it finds something. |
| Trail of Bits: differential-review, insecure-defaults, sharp-edges | [trailofbits/skills](https://github.com/trailofbits/skills) | **Adopt (3 skills) — manual-only** | Credible security firm; ~6k stars, ~35 contributors, active (pushed 2026-07-01), CC-BY-SA-4.0 (fine for internal use). `differential-review` adds blast-radius + git-history rigor beyond built-in `/security-review`; `insecure-defaults` (fail-open configs, hardcoded secrets) and `sharp-edges` (footgun-API review — good for the Zod IPC contract surface) have no built-in equivalent. Language-agnostic; complements, does not replace, our `review-electron-security`. |
| superpowers (bundle) | [obra/superpowers](https://github.com/obra/superpowers) | **Skip bundle / conditional cherry-pick** | 244k stars, MIT, very active — but an opinionated whole-workflow methodology (hooks push brainstorm→plan→subagent pipeline onto every task) that would fight our add-feature / add-ipc-channel skills; its review skills duplicate built-ins. *Conditional:* vendor only `test-driven-development` + `verification-before-completion` as copied standalone skills **if** the team opts into enforced red-green-refactor (strict: code written before its test gets deleted). Team decision — not installed by default. |
| playwright-cli skill (official Microsoft) | [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) | **Conditional — install at Phase 4–5** | Apache-2.0, ~12k stars, active; the official skills-not-MCP path. Useful for driving/debugging the renderer as a web app and as a test-authoring reference. **Zero Electron coverage** (no `_electron.launch()`) — cannot drive the packaged app; Electron E2E fixtures stay in our own conventions. |
| GitGuardian agent-skills (secret scanning) | [GitGuardian/agent-skills](https://github.com/GitGuardian/agent-skills) | **Skip skill; take the pattern** | Official vendor repo but brand-new (4 stars) and requires ggshield + SaaS API key. Solve the same problem (block secrets pre-commit) deterministically in our hook layer with gitleaks — zero session tokens. Tracked as a follow-up hook. |
| anivar/msw-skill | [anivar/msw-skill](https://github.com/anivar/msw-skill) | **Skip; mine content** | Content is genuinely good — MSW v2-only enforcement, `server.boundary()` for concurrent Vitest, and an SSE `ReadableStream` mocking guide (directly our use case). But: 1 star, single author, one commit burst. MIT — fold its rules into our own `write-tests` skill instead of depending on it. |
| citypaul/.dotfiles testing skills | [citypaul/.dotfiles](https://github.com/citypaul/.dotfiles) | **Skip; mine content** | Highest-quality Vitest/React testing content found (coverage-theater and `act()`-misuse catalogs, test factories) — but it's one person's dotfiles and explicitly prefers Vitest Browser Mode *over* our chosen RTL+jsdom; adopting it would steer Claude against our stack. |
| "Dave's Claude Code Skills" | [DavidROliverBA/Daves-Claude-Code-Skills](https://github.com/DavidROliverBA/Daves-Claude-Code-Skills) | **Skip** | Referenced in our planning doc, but it's an Obsidian/architecture knowledge-management bundle — no code-review or security skills. 63 stars, 1 contributor, stale since 2026-03-02. |
| tdd-guard | [nizos/tdd-guard](https://github.com/nizos/tdd-guard) | **Skip (watch successor)** | Hook-enforced TDD with native Vitest reporter — mechanically stronger than superpowers' TDD skill — but in maintenance mode; development moved to [Probity](https://github.com/nizos/probity). Re-check when Probity stabilizes. |
| aitmpl (davila7/claude-code-templates) | [repo](https://github.com/davila7/claude-code-templates) | **Skip** | 28k stars but no testing or security skills at all (business/marketing categories). |
| testmu / LambdaTest vitest- & playwright-skills | [LambdaTest/agent-skills](https://github.com/LambdaTest/agent-skills) | **Skip** | Generic `Calculator.add(2,3)`-grade boilerplate; nothing Claude doesn't already know. |
| lackeyjb/playwright-skill | [repo](https://github.com/lackeyjb/playwright-skill) | **Skip** | Stale (~6.5 months), ad-hoc-script model, superseded by official playwright-cli skill. |
| anthropics/skills webapp-testing | [anthropics/skills](https://github.com/anthropics/skills) | **Skip** | Python Playwright, browser-only; covered by built-in `/run` + `/verify`. (Repo's `skill-creator` is worth using when authoring our own skills.) |
| hacktricks electron-app-pentest | [abelrguezr/hacktricks-skills](https://github.com/abelrguezr/hacktricks-skills) | **Skip; crib sheet only** | AI-converted content, 16 stars, low provenance — but its attack checklist (contextIsolation bypass, preload issues, `shell.openExternal`, V8 snapshot tampering) is a useful outline for our `review-electron-security`. |

## 3. Adopted skills — install & activation scope

### 3.1 security-guidance plugin — always on

**Set up (2026-07-03).** Enabled repo-wide via `enabledPlugins` in the
checked-in `.claude/settings.json` — it auto-installs for anyone opening the
repo (and works in cloud sessions). Threat model encoded in:

- `.claude/claude-security-guidance.md` (≤8KB combined cap): safeStorage-only
  tokens, contextIsolation/sandbox invariants, Zod-parsed IPC inputs, CSP,
  `openExternal` allowlist, untrusted model output, updater integrity.
- `.claude/security-patterns.json` (≤50 rules): 10 deterministic rules
  (`nodeIntegration: true`, `contextIsolation: false`, `sandbox: false`,
  `webSecurity: false`, raw `ipcRenderer` in renderer, tokens in web
  storage, `openExternal`, `executeJavaScript`, `<webview>`, weakened CSP).
  JSON, not YAML — the YAML variant is silently ignored unless PyYAML is
  importable.

Prereq: Python 3.8+ on PATH (plugin bootstraps a venv under
`~/.claude/security/` on first run). Scope: **always on** — hook-driven,
not context-loaded.

### 3.2 Trail of Bits trio — manual trigger only

**Set up (2026-07-03) by vendoring** instead of the plugin marketplace:
the three skill directories (SKILL.md + reference files, minus logo/agent
manifests) are copied into `.claude/skills/` with
`disable-model-invocation: true` added to each frontmatter → **0 baseline
tokens**, no marketplace trust/update surface, works offline. Attribution:
`.claude/skills/TRAILOFBITS-LICENSE` (CC-BY-SA-4.0) + a source note in each
SKILL.md. Re-sync from https://github.com/trailofbits/skills at the
quarterly review (§6).

Scope — deliberate invocation only:
- `/differential-review` — before merging any PR touching `src/main`,
  `src/preload`, or `packages/shared/src/ipc-contract.ts`.
- `/insecure-defaults` — when adding config, env handling, or defaults.
- `/sharp-edges` — when changing the IPC contract surface or public APIs of
  `@myvng/shared`.

### 3.3 playwright-cli skill — deferred to Phase 4–5

```
pnpm dlx playwright-cli install --skills
```

Install when E2E work starts. Scope: model-invocable is fine (its
description triggers only on browser-driving tasks). Remember it drives
browsers, not the Electron shell.

### 3.4 One-time action

Run `/run-skill-generator` once the app launches reliably, so the built-in
`/verify` and `/run` skills learn our Electron launch recipe instead of
re-inferring it every session.

## 4. Compression policy (caveman-style skills)

Even though caveman is not adopted, this policy governs any future
output-compression skill or instruction:

**Never compressed — full prose, hedging and uncertainty preserved:**
- Security reviews, threat modeling, `/security-review`,
  `review-electron-security` runs
- ADR and architecture writing (`docs/adr/`, `docs/architecture.md`)
- Incident-response docs and postmortems
- IPC contract design and review (`packages/shared/src/ipc-contract.ts`)
- Auth / token-handling / safeStorage code and review
- Code-review feedback (a dropped hedge is a dropped risk signal)

**Acceptable for compression** (only via a manual, per-session, `lite`-grade
trigger — never an always-on hook): bulk renames, changelog updates,
mechanical refactors, boilerplate scaffolding.

**Preferred alternative:** a single "be concise; skip preamble and
recap" line in CLAUDE.md captures ~the same output savings with zero
dependency, per independent benchmarking.

## 5. Relationship to our own planned skills

Nothing found obsoletes them; research sharpened their scope:

- `review-electron-security` — fills a genuinely empty niche (no mature
  Electron-security skill exists anywhere). Seed from the hacktricks
  checklist (§2); consider wrapping Doyensec's `electronegativity` npm
  scanner — unclaimed territory. The security-guidance plugin (§3.1) is its
  always-on enforcement layer; this skill is the on-demand deep pass.
- `write-tests` (planned) — seed from anivar/msw-skill's MSW-v2 + SSE
  `ReadableStream` rules and citypaul's anti-pattern catalogs (both MIT).
  Must cover what no public skill does: `_electron.launch()` Playwright
  fixtures for the packaged app.
- `add-ipc-channel`, `add-feature` — unaffected; keeping superpowers'
  workflow hooks out (§2) protects these from being overridden.

## 6. Re-evaluation cadence

Quarterly (next: 2026-10), or when: a pinned skill repo goes >6 months
stale, Claude Code built-ins absorb a capability (this killed most
candidates above), or Probity (tdd-guard successor) stabilizes.
