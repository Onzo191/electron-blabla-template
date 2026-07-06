# Chat feature

Implementation of the AI Agents chat (spec: `docs/ai-agents-spec/`).
Covers the sidebar (pinned/recent/search + CRUD), landing page with agent
greeting and prompt topics, POST-based SSE streaming with reasoning and
tool status, the markdown widget pipeline (9 widgets), feedback, smart
auto-scroll, and infinite history. Attachments, message export, and MCP
management are designed for but deferred (widgets render; their
upload/download actions are stubbed).

## Layers

```
packages/shared/src
  api/envelope.ts        paginationSchema · dataEnvelopeSchema · paginatedSchema
  domain/                agent · conversation · message · attachment · chat-widgets
  sse/ask-events.ts      AskSseEvent union + parseAskSseLine (pure)

renderer/src
  shared/lib/api-client  apiGet/Post/Patch/Delete · Bearer injection · status→code
  shared/lib/auth-token  in-memory single-flight cache over auth:* IPC
  shared/lib/sse.ts      streamSseLines: fetch+ReadableStream line reader,
                         stall watchdog, abort-vs-drop distinction
  features/agents        default agent · list · basic-info (greeting, topics)
  features/conversations sidebar list (infinite + search) · pin/rename/delete
  features/chat          messages query · streamAsk · chatSlice · UI pipeline
```

## Streaming lifecycle (ADR 4 in practice)

```
ChatInput.send
  └─ chatSlice.sendMessage → startStream(payload)
       aborts any live stream, session += 1        (stale-event guard)
       status: connecting · optimistic user bubble (slice state)
       streamAsk(POST /v2/api/messages/ask, callbacks, AbortController)
         data: [START]                 → ignored
         {type:"conversation",id,name} → seedNewConversation(id) into Query
                                         cache, set pendingRedirect
         {reasoning}                   → reasoningText (accordion, open)
         {type:"tool_status",…}        → toolStatus indicator
         {response}                    → tokens (/\S+|\s+/g) → queue → rAF
                                         drain (~1 token/frame; batch scales
                                         when the queue backs up)
         {references:[…]}              → streamReferences
         {error,…}                     → status: error + inline retry block
         data: [DONE]                  → flush queue → writeCompletedExchange
                                         → invalidate conversation lists
                                         → slice resets to idle
```

Key properties:

- **The stream is slice-owned, not component-owned.** The AbortController,
  rAF id, and token queue live in the `createChatSlice` factory closure
  (one per store instance, injectable for tests). Navigating landing →
  detail never interrupts the stream.
- **Session guard.** Every SSE callback closes over its session number and
  no-ops if a newer send started. Rapid re-sends can never interleave.
- **Cancel keeps partial output.** Stop writes what was generated as a
  completed exchange (if any text arrived); before first token it resets.
- **New-conversation redirect.** The messages cache is seeded *before*
  `ChatStreamRedirector` navigates; with `staleTime: Infinity` on message
  history the detail route mounts with fresh cache — no refetch, no flash.

## TanStack Query design

Query keys live only in `api/keys.ts` factories. `queryOptions()` /
`infiniteQueryOptions()` factories in `api/options.ts` are shared between
route loaders (`prefetch*`/`ensureQueryData` via router context) and hooks.

| Cache | Shape | Policy |
|---|---|---|
| `["conversations","list",{search}]` | infinite, `Paginated<Conversation>` | debounced search in key, `placeholderData: keepPreviousData` |
| `["conversations","pinned"]` | `Conversation[]` | invalidated with lists |
| `["messages", conversationId]` | infinite, newest-first pages | `staleTime: Infinity` — new messages arrive only via stream write-back; `select` reverses to render order |
| `["agents", …]` | default / list / basic-info | staleTime 5 min |

Mutations (rename / pin / unpin / delete) are optimistic: cancel queries →
snapshot list + pinned caches → patch → rollback on error (toast) →
invalidate on settle. Feedback (like/dislike) is a targeted
`setQueryData` patch — no invalidation. Sidebar hover prefetches the
conversation's first message page.

## Widget pipeline

`content → cleanCitations → parseSegments → render`

- `cleanCitations` maps `[ID:doc]` to stable `[n]` numbers and strips
  `filecite`/`turnXfileY` artifacts.
- `parseSegments` extracts `====MARKER==== … ====END_MARKER====` blocks
  (payload schemas: `packages/shared/src/domain/chat-widgets.ts`, all
  loose objects). A block whose closing marker hasn't streamed in yet is
  withheld entirely — widgets never parse partial JSON. Malformed payloads
  become `invalid-widget` segments and render nothing.
- Prose renders through `MessageMarkdown`: split into blank-line blocks
  (fence-aware), each block an independently memoized `react-markdown`
  (remark-gfm + rehype-highlight) — during streaming only the final block
  re-parses per painted frame.
- Widgets talk back through `ChatActionsContext`
  (`submitMessage` / `prefillInput` / `openLightbox` / `copyToClipboard`)
  provided by `ChatActionsHost` — widgets import no stores or features.
- Every widget renders inside its own ErrorBoundary with a null fallback;
  `MessageList` has its own boundary so a thread crash never destroys the
  composer draft.

## Error taxonomy

| Code | Source | UX |
|---|---|---|
| `NETWORK` | fetch failed to connect | inline retry / toast |
| `UNAUTHORIZED` (401) | api-client (invalidates token cache) | "session expired" message |
| `FORBIDDEN` / `NOT_FOUND` / `RATE_LIMITED` / `SERVER` | HTTP status map | per-code i18n strings |
| `VALIDATION` | Zod parse failure | "couldn't process this" |
| `STREAM_ERROR` | mid-stream `{error}` event | inline `MessageError` + Retry (slice keeps `lastAskPayload`) |
| `STREAM_INTERRUPTED` | reader rejected mid-stream | inline retry |
| `TIMEOUT` | 60s stall watchdog | inline retry |
| `ABORTED` | user cancel | silent |

Mapping to user strings: `features/chat/lib/error-messages.ts` (i18n).

## i18n

`react-i18next`, namespaces `aiAgents` + `chatbot`, languages `vi`
(default) + `en`, generated from `docs/ai-agents-spec/locales-strings.json`
into `renderer/src/i18n/locales/`. Adding a language = generating another
JSON and listing it in `i18n/index.ts`. Language is uiSlice state
(Settings picker); repo-invented keys (Cancel/Retry/offline/reasoning)
live under `aiAgents:common.*` and `aiAgents:message.*`.

## Auth (interim)

Dev token pasted in Settings → `auth:setToken` IPC → safeStorage.
`shared/lib/auth-token.ts` caches it in memory (single-flight) and
`api-client`/`sse` attach `Authorization: Bearer`. 401 invalidates the
memory cache only. A real login flow replaces the Settings field later.

## Deviations from the original plan (documented)

- **No virtualization** (`@tanstack/react-virtual` deferred): streaming
  dynamic heights + scroll-height-delta pagination + `role="log"` fight
  virtualizers. Perf comes from memoized markdown blocks, the rAF token
  queue, and pagination. Revisit if >~300 rendered messages jank.
- **Token drain batches adaptively** (1/frame normally, up to 8/frame when
  the queue exceeds 200 tokens) so the paint never lags a fast stream by
  more than a couple of seconds; spec said a fixed 1/frame.
- **Chakra recipe variants** (chip/ghost-muted) are shared wrapper
  components (`ChipButton`, `GhostIconButton`) instead of theme recipes:
  custom recipe variants need the Chakra typegen step, which this repo
  doesn't run.
- **CSP `connect-src` is `https:`-broad** during development; tightening
  to the exact API origin is on the release checklist.

## Testing map

- `packages/shared`: `ask-events.test.ts` (every event kind, malformed,
  forward-compat), contract tests incl. `auth:clearToken`.
- Pure: `parse-segments.test.ts`, `clean-citations.test.ts`.
- Transport: `sse.test.ts` (chunk-split reassembly, trailing flush,
  pre-stream HTTP errors, abort vs drop), `api-client.test.ts` (Bearer,
  401, VALIDATION, search params).
- Slice: `chatSlice.test.ts` — vanilla store with injected scheduler/ask/
  cache (drain order, flush-on-done, session guard, cancel semantics,
  redirect consume, retry).
- Components: `ChatInput.test.tsx` (Enter/Shift+Enter/stop/web-search),
  `MessageSegments.test.tsx` (widget fixture: suggestions submit + hidden
  on non-final, colleague lookup, lightbox, references links, malformed
  JSON survives, export command).
