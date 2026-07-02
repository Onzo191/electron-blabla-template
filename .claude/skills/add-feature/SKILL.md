---
name: add-feature
description: >
  Scaffold a new renderer feature (chat, conversations, agents, settings,
  auth, ...) in apps/desktop/src/renderer. Use when creating a feature
  folder, adding a route with data fetching, or deciding where new UI code
  belongs. Encodes the feature-folder layout, query-key factory, and the
  Query-vs-Zustand split.
---

# Add a renderer feature

## Folder layout

```
apps/desktop/src/renderer/src/features/<name>/
├── components/     # feature-private React components (function declarations)
├── hooks/          # use* hooks, incl. query/mutation hooks
├── api/
│   ├── keys.ts     # query-key factory — the ONLY place keys are defined
│   └── <name>.ts   # fetchers: api-client call + Zod parse from @myvng/shared
├── store/          # optional Zustand slice (see below)
└── index.ts        # the feature's ONLY public surface
```

Other features and `app/` may import ONLY from `features/<name>` (the
`index.ts`). Never re-export another feature's internals.

## Query-key factory (`api/keys.ts`)

```ts
export const conversationKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationKeys.all, "list"] as const,
  detail: (id: string) => [...conversationKeys.all, "detail", id] as const,
};
```

Every `useQuery`/`useMutation`/`invalidateQueries` uses these — never inline
key arrays.

## Fetcher pattern (`api/<name>.ts`)

Fetch via `shared/lib/api-client.ts`, parse with the Zod schema from
`@myvng/shared` (never a locally redefined type), return the inferred type.
Errors normalize to `AppError { code, message, cause }`.

## When the feature gets a Zustand slice

Only for state that is NOT backend data: draft input, in-flight streaming
tokens, agent status, panel open/closed. Rules:

- Backend data lives in the Query cache. Never copy it into the slice.
- Streaming: tokens flow into the slice while in flight; the completed
  message is written into the Query cache `onDone`, then the slice resets.
- Slice lives in `store/<name>Slice.ts`, added to the root store's slice
  composition, tested as a vanilla store.

## Done checklist

- [ ] Folder matches the layout; public surface only through `index.ts`
- [ ] Keys from the factory; responses Zod-parsed; no `any`
- [ ] No Query data copied into Zustand
- [ ] Route added (TanStack Router) if the feature has a page
- [ ] Tests: slice (vanilla), one hook or component test with MSW
- [ ] `pnpm check` passes
