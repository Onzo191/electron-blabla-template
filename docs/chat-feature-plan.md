# Chat App Build Plan — myVNG Agent Desktop

## Context

`docs/ai-agents-spec/` is a complete product spec (cloned from the existing myVNG web module) for the AI Agents chat: REST API, POST-based SSE streaming protocol, 9 markdown-embedded UI widgets, UX flows (token-queue streaming, smart auto-scroll, infinite history), and 6-language strings. The repo today has only scaffolding: a `conversations` feature stub (wrong schema vs the real backend), a `/chat/$conversationId` placeholder route, no SSE, no auth header, no toast system, no i18n, no animation library.

**Goal of this build round (user-confirmed scope):** Core chat — sidebar (pinned/recent/search/rename/delete/pin), landing page with agent greeting + prompt topics, streaming with reasoning accordion + tool status, markdown + all 9 widgets rendered, like/dislike feedback, smart auto-scroll, infinite history. **Deferred to later rounds:** attachment upload/download, message export API, MCP connection management (widgets that depend on them render but their download/upload actions are stubbed with a "coming soon" disabled state).

**User-confirmed decisions:**
- **Auth:** dev-token approach — Settings gets a token input persisted via existing `auth:setToken`/safeStorage; api-client injects `Authorization: Bearer`. Real login/SSO is a separate later task.
- **i18n:** install `react-i18next` now with `vi` + `en` imported from `docs/ai-agents-spec/locales-strings.json` (other 4 languages = drop-in JSON later).
- Everything follows the existing ADRs (docs/architecture.md): renderer calls backend directly over HTTPS/SSE (ADR 1); contract-first IPC (ADR 2); Query owns server state, Zustand owns transient state (ADR 3); streaming lives outside Query — tokens into a Zustand slice, completed message written back to the Query cache (ADR 4); feature folders (ADR 5).

## Key architecture decisions

1. **SSE = renderer `fetch` + `ReadableStream`** (POST endpoint → EventSource impossible; matches ADR 1). Generic line-reader in `shared/lib/sse.ts`, chat-specific `streamAsk()` with **typed callbacks** (not async iterator — callbacks map 1:1 to slice actions, trivial abort guarding).
2. **Stream is owned by the Zustand `chatSlice`, not a component** — survives the landing → `/chat/$id` route transition. AbortController, rAF id, and token queue live in module scope (non-serializable, high-churn); only renderable state in the store.
3. **New-conversation flow:** landing sends without `conversationId` → SSE `{type:"conversation"}` event → slice seeds an empty messages cache entry (`setQueryData`) **before** setting a `pendingRedirect` → tiny redirector component navigates → detail page mounts with seeded cache (staleTime `Infinity` on messages) → zero refetch/flash, stream continues uninterrupted.
4. **TanStack Query optimization:** `queryOptions()` factories shared between route loaders (`ensureQueryData` / `ensureInfiniteQueryData`) and hooks; infinite queries for conversation list (debounced search in key, `placeholderData: keepPreviousData`) and message history (newest-first pages, `select` reverses to render order, `staleTime: Infinity` — new messages arrive only via stream write-back); optimistic mutations with snapshot/rollback for rename/pin/delete; hover-prefetch of a conversation's first message page; targeted `setQueryData` for feedback (no invalidation).
5. **Widget pipeline:** payload Zod schemas in `packages/shared` (backend contract); pure segment parser in `features/chat/lib`; registry map block-type → component; widget click-events flow through a chat-internal `ChatActionsContext` (`submitMessage`, `prefillInput`, `openLightbox`, `copyToClipboard`) — no cross-feature imports.
6. **Animation: `motion` v12** via `LazyMotion` + `m.*` (~18 kB gz) for the few things CSS can't do (sidebar reorder on pin via `layout`, enter/exit of scroll-to-bottom button & lightbox, new-message entrance); CSS keyframes for loops (cursor blink, typing dots); Chakra built-ins for dialogs/menus/collapsible — never double-animate. `<MotionConfig reducedMotion="user">` + `motion-reduce:` guards.
7. **Virtualization deferred** (deviation from ADR 4's mention, documented): streaming dynamic heights + scroll-height-delta pagination + `role="log"` fight virtualizers. Perf comes from memoized markdown blocks + rAF token queue + pagination. Revisit if >~300 rendered messages jank.
8. **Error model:** one taxonomy `NETWORK / UNAUTHORIZED / FORBIDDEN / NOT_FOUND / RATE_LIMITED / SERVER / VALIDATION / STREAM_ERROR / STREAM_INTERRUPTED / TIMEOUT / ABORTED(silent)` → i18n'd user messages. Stream failures render an inline retry block in the bubble (slice keeps `lastAskPayload`); mutation failures toast + rollback; per-widget null-fallback ErrorBoundaries so one bad payload never kills the thread; ErrorBoundary around `MessageList` alone so a render crash never destroys the input draft.

## New dependencies (apps/desktop)

`motion@^12`, `react-markdown@^10`, `remark-gfm@^4`, `rehype-highlight@^7`, `dompurify@^3.2` (+`@types/dompurify` if needed), `i18next@^25`, `react-i18next@^15`.
Rejected: shiki (1 MB+ grammars for a helpdesk agent), rehype-raw (security), auto-animate/react-spring (motion covers all), @tanstack/react-virtual (deferred).

---

## Phase 0 — Foundation (tokens, toaster, i18n, motion)

- `styles/tokens.css` + `@theme` in `styles/app.css` + `theme/system.ts` (three-touch rule) — add: `--bubble-user`, `--surface-raised`, `--border-subtle`, `--accent`, `--text-faint`, `--success`, `--danger`, `--radius-lg/-xl/-full`, `--font-mono` (oklch light + `.dark`). Design language: quiet surfaces, hairline borders, one accent; user messages = tinted right-aligned bubble (max-w ~65ch); agent messages = full-width borderless prose.
- Chakra recipes in `theme/system.ts`: Button variants `chip` (radius-full, subtle border) and `ghostMuted` (icon actions).
- `shared/components/toaster.tsx` — `createToaster({ placement: "bottom-end", max: 3 })` + `<Toaster/>` mounted once in `app/providers.tsx`.
- `shared/components/SafeHtml.tsx` — DOMPurify with tag/attr allowlist; the ONLY raw-HTML sink (backend HTML greetings).
- i18n: `apps/desktop/src/renderer/src/i18n/{index.ts,locales/en.json,locales/vi.json}` — extract `aiAgents`+`chatbot` namespaces for en/vi from `docs/ai-agents-spec/locales-strings.json`; language stored in `uiSlice` (default `vi`), picker in Settings.
- `app/providers.tsx`: add `<LazyMotion features={domAnimation} strict>` + `<MotionConfig reducedMotion="user">`.

## Phase 1 — Shared contracts + HTTP/SSE clients + dev auth

**packages/shared (contract first):**
- `src/api/envelope.ts` — `paginationSchema`, `dataEnvelopeSchema(item)`, `paginatedSchema(item)`, `Paginated<T>`.
- `src/domain/conversation.ts` — **breaking fix** to match real backend: `{id, name, createdAt}` + pinned flag; migrate `features/conversations` + `ConversationList.test` in same change.
- `src/domain/agent.ts` — `agentSummary/agentDetail/agentBasicInfo` (greetingMessages translations, promptTopics; unknown sub-objects as `z.unknown()`, verify against live API).
- `src/domain/message.ts` — `chatMessageSchema` `{id, role, content, createdAt, reasoning?, references?, feedback?}` (verify field names vs live history endpoint — schema is the single fix point).
- `src/domain/chat-widgets.ts` — `widgetBlockSchema` discriminated union for all 9 widget payloads (media, suggestions, support_contact, references, closing, attachments, export_artifact, export_format_picker, ask_colleagues).
- `src/sse/ask-events.ts` — normalized `AskSseEvent` union (`start|conversation|message-meta|reasoning|tool-status|response|references|stream-error|done`) + pure `parseAskSseLine(line)` (handles `data: ` prefix, `[START]`/`[DONE]`, malformed → null, unknown → null forward-compatible).
- `src/ipc-contract.ts` — add `auth:clearToken` (+ handler in `main/ipc/auth.ts`; service method exists).

**Renderer HTTP client:**
- `shared/lib/auth-token.ts` — in-memory single-flight cache over `auth:getToken` IPC; `getAuthToken/setAuthToken/clearAuthToken/invalidateAuthTokenCache`.
- `shared/lib/api-client.ts` — rewrite: core `request()` + `apiGet/apiPost/apiPatch/apiDelete`, Bearer injection, `searchParams`, `signal`; `ApiError.status`; status→code mapping; on 401 invalidate token cache, never retry (custom `retry` fn in `app/queryClient.ts`).
- `shared/lib/sse.ts` — `streamSseLines({url, body, signal, stallTimeoutMs=60s, onLine})`: fetch POST, pre-stream HTTP error → ApiError; reader loop with TextDecoder `{stream:true}`, split `\n`, keep partial line, flush trailing buffer; stall watchdog reset per chunk (`AbortSignal.any`); caller-abort = silent, read rejection = `STREAM_INTERRUPTED`.
- Dev token UI in `routes/settings.tsx`: Chakra password input + save/clear → `auth:setToken`/`auth:clearToken` (+ update in-memory cache).

## Phase 2 — Routes, agents feature, sidebar (conversations extension)

**Route restructure** (`app/router.tsx` → `createRootRouteWithContext<{queryClient}>`, pass `context: {queryClient}`):
```
routes/__root.tsx               # global shell only: Toaster, UpdateNotifications, Outlet
routes/chat.tsx                 # LAYOUT: <ChatSidebar/> + <Outlet/>; loader warms agents + pinned
routes/chat.index.tsx           # landing; loader warms default agent
routes/chat.$conversationId.tsx # detail; loader ensureInfiniteQueryData(messages, first page)
routes/index.tsx                # beforeLoad → redirect to /chat
routes/settings.tsx             # + dev token field + language picker; entry = gear in sidebar footer
```
Loaders only warm the cache via shared `queryOptions()` factories (defined next to each `keys.ts`); components use the same options with `useQuery`/`useInfiniteQuery`.

**`features/agents/`** (new): `api/keys.ts`, `api/agents.ts` (default agent, list paginated, basic-info), hooks, `AgentPicker` (Chakra Menu), `AgentGreeting` (SafeHtml + response-language pick from greeting translations), `PromptTopics` (chip buttons → submit), `index.ts`.

**`features/conversations/`** (extend): keys `all/lists()/list(search)/pinned()`; infinite list fetcher with search; mutations `pin/unpin/rename/delete` (optimistic: cancelQueries → snapshot list+pinned → setQueryData → rollback onError → invalidate onSettled; delete of active conversation navigates to `/chat` and `removeQueries` its messages); `ConversationSidebarList` (Pinned + Recents sections, debounced search input, IntersectionObserver bottom sentinel), `ConversationItem` (`m.li layout` reorder, Chakra Menu, 2s flash-highlight after pin via `flashConversationId` in chatSlice + CSS transition), `RenameConversationDialog`, `DeleteConversationDialog`. Hover-prefetch first message page (`usePrefetchConversation`).

**`features/chat/components/ChatSidebar.tsx`** composes AgentPicker + search + lists + "New chat" + settings gear (imports via feature `index.ts` only).

## Phase 3 — Chat read path (history, bubbles, markdown, widgets)

- `features/chat/api/keys.ts` (`messages(conversationId)`), `api/messages.ts` (page fetcher newest-first, `rateMessage`), `hooks/useMessagesInfinite.ts` — `useInfiniteQuery`, `select` reverses pages+items to oldest→newest, `staleTime: Infinity`, `gcTime` 10 min; top 1px sentinel → `fetchNextPage`; `useLayoutEffect` scroll-height-delta restoration (`scrollTop += scrollHeight - prev`).
- `lib/clean-citations.ts` (REF_REGEX `[ID:...]`→`[n]`, FILECITE_REGEX junk removal), `lib/parse-segments.ts` (pure: markdown → `ChatSegment[]` of `prose | widget | invalid-widget`; incomplete widget block during stream renders nothing until closing marker; JSON+Zod parse once on completion).
- `MessageMarkdown.tsx` — react-markdown + remark-gfm + rehype-highlight (curated language subset); split prose into `\n\n` blocks, each a `React.memo` compared by string → during streaming only the final partial block re-parses; custom `a` (protocol allowlist http/https/mailto, `target="_blank" rel="noopener noreferrer"`), custom `img` (https allowlist, lazy).
- `components/widgets/` — `registry.tsx` (type→component map), `WidgetRenderer.tsx` (per-widget ErrorBoundary, null fallback), 9 widgets + `MediaLightbox` (Chakra Dialog owns focus trap; motion crossfade inside). Deferred-scope stubs: `ExportArtifactCard` renders with View link, Download disabled (tooltip "coming soon"); `AttachmentRows` opens URL directly.
- `ChatActionsContext.tsx` + `useChatActions()` — provided by `ChatConversation`/`ChatLanding`.
- `MessageBubble.tsx` (user/agent variants, status switch loading|streaming|done|error), `ReasoningAccordion` (Chakra Collapsible), `ToolStatusIndicator`, `MessageError` (retry), `RatingActions` (+ DislikeCommentDialog → `POST /v2/api/feedback`, targeted `setQueryData` of `feedback` field), response-time footer.
- `MessageList.tsx` — `role="log"` container + visually-hidden `role="status" aria-live="polite"` announcer ("typing/complete/failed"); skeleton bubbles for initial load.

## Phase 4 — Streaming write path

- `features/chat/api/ask.ts` — `streamAsk(payload, callbacks, signal)`: `streamSseLines` + `parseAskSseLine` + switch dispatch.
- `features/chat/store/chatSlice.ts` (composed into `store/useAppStore.ts`, `AppStore = UiSlice & ChatSlice`):
  - State: `status idle|connecting|streaming|error`, `sessionId`, `activeConversationId`, `pendingUserMessage`, `streamingMessageId`, `streamedText`, `reasoningText`, `toolStatus`, `references`, `error`, `lastAskPayload`, `pendingRedirectConversationId`, `drafts: Record<convId|"new", string>`, `flashConversationId`.
  - Module scope (never in state): `controller`, `rafId`, `tokenQueue`.
  - Actions: `send()` (aborts live stream first, `sessionId++`, clears queue, optimistic user msg, connect), `cancel()`, `retry()`, `setDraft()`, `consumeRedirect()`.
  - Token drain: `onResponse` splits by `/\S+|\s+/g` into queue; rAF loop appends ~1 token/frame to `streamedText`; **injectable scheduler** (`{raf, caf}` deps) for jsdom tests.
  - Every SSE callback closes over its `sessionId` and no-ops if stale (rapid resend / switch safety).
  - `onDone`: synchronously flush remaining queue → build final `ChatMessage` → `writeCompletedExchange()` → invalidate conversation lists → reset to idle.
- `features/chat/api/cache.ts` — `writeCompletedExchange(convId, userMsg, botMsg)` prepends into page 1 of the infinite cache; `seedNewConversation(convId)` creates an empty first page. (Imports the `queryClient` singleton; mockable in vanilla slice tests.)
- New-conversation redirect: `ChatStreamRedirector` (tiny, mounted in `routes/chat.tsx` layout) watches `pendingRedirectConversationId` → `router.navigate` → `consumeRedirect()`. Typing bubble renders only when route param === `activeConversationId`.
- `ChatInput.tsx` — autogrow Chakra Textarea, Enter=send / Shift+Enter=newline (guard `isComposing`), Escape=stop, one Send/Stop IconButton with swapping aria-label, web-search toggle; draft per conversation from slice.
- `hooks/useAutoScroll.ts` — `shouldAutoScroll` ref disengaged on scroll-up, re-engaged <8px from bottom; button appears >120px (motion AnimatePresence, bouncing dots while streaming); `useLayoutEffect` on `streamedText` length.
- `ChatLanding.tsx` (greeting + topics + input) and `ChatConversation.tsx` (list + input + providers) wire it together.

## Phase 5 — Polish

- Animations pass per the usage map (§decision 6); CSS keyframes (`chat-bounce`, cursor blink) in `app.css` with reduced-motion guards.
- Offline banner above input (`navigator.onLine` + events).
- A11y audit vs checklist (roles, focus after send, aria-pressed on ratings, lightbox arrows).
- **Security hardening (must-do, currently missing):** add a strict CSP — `<meta http-equiv="Content-Security-Policy">` in `renderer/index.html` with `connect-src 'self' <API origin>`, `img-src 'self' https: data:`, `script-src 'self'`, no `unsafe-inline` for scripts (Chakra/Tailwind need `style-src 'unsafe-inline'`); confirm `setWindowOpenHandler` external-link policy covers markdown links. Run `/review-electron-security` + `/differential-review` on the preload/IPC/CSP diff before merge.

## Phase 6 — Docs (English, per repo convention)

- `docs/chat-feature.md` — architecture of the chat feature: data-flow diagram (Query vs chatSlice vs SSE), streaming lifecycle & sessionId guard, new-conversation redirect mechanics, widget pipeline, error taxonomy table, query-key & invalidation matrix, virtualization deferral note.
- Update `docs/architecture.md` — mark chat data-flow as implemented; note react-virtual deferral; i18n decision.
- Update `docs/ui-guidelines.md` — new tokens, `chip`/`ghostMuted` recipes, motion usage rules (when motion vs CSS vs Chakra).
- Update `CLAUDE.md` docs list (one line for chat-feature.md).

## Deferred (planned, not in this round)

- **Attachments** (upload multipart + polling `refetchInterval` while `processing`, chips, delete, download via new `file:saveBinary` IPC: `dialog.showSaveDialog` + fs in main).
- **Export API** (blob POST + `content-disposition`, save via same IPC).
- **MCP management screen.** — Each was designed for; nothing in this round blocks them.

## Testing (Vitest + RTL + MSW v2; conventions from /write-tests)

- Shared: `ask-events.test.ts` (every event kind, prefix variants, malformed), `chat-widgets` schema tests, contract test for `auth:clearToken`.
- Pure: `parse-segments.test.ts`, `clean-citations.test.ts`.
- Lib: `sse.test.ts` (chunk-split-mid-line reassembly, trailing buffer flush, abort vs drop, stall timeout), `api-client.test.ts` (Bearer injection, 401, Zod mismatch, searchParams).
- Slice: `chatSlice.test.ts` vanilla store + injected scheduler (drain order, flush-on-done, double-send sessionId guard, cancel, redirect consume).
- MSW: `tests/msw/handlers.ts` gains paginated conversations/messages/agents + SSE `ReadableStream` fixtures (happy path, mid-stream `{error}`, split chunks).
- Components (~8): ChatInput, WidgetRenderer (all 9 markers + malformed), SuggestionChips, ColleagueCard, MessageBubble status matrix, ConversationItem (optimistic rename, delete-active navigates), useSendMessage full loop (tokens→slice, done→cache, slice reset), MessageList (role=log, announcer, scroll button).
- E2E (Playwright `_electron`, golden path only): launch → set dev token in Settings → send message → streamed reply renders → switch conversation.

## Verification

1. `pnpm check` (typecheck + Biome + all unit tests) green.
2. `pnpm dev` against the real/staging backend with a dev token: send first message from landing → observe redirect without flash, word-by-word streaming, reasoning accordion, stop button aborts, retry after airplane-mode kill, rename/pin/delete with rollback on forced 500 (devtools offline), search debounce, dark mode + vi/en switch.
3. MSW-mocked run for widget fixtures: paste a fixture conversation exercising all 9 widgets.
4. `/review-electron-security` pass on the final diff (CSP, preload, IPC, link handling).

## Risks / edge cases (designed for)

- rAF in jsdom → injectable scheduler. Token-queue leak on fast `[DONE]` → synchronous flush. Late SSE events after abort → sessionId guard. Redirect vs history fetch race → seed cache before navigate + `staleTime: Infinity`. Partial final SSE line → buffer flush. Existing `conversationSchema` mismatch → migrated in Phase 1 (breaking, contained). `AbortSignal.any` in test env → polyfill in setup if needed. Message-history field names unverified vs live API → Zod schema is the single fix point; verify early in Phase 3.
