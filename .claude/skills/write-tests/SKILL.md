---
name: write-tests
description: >
  Testing conventions for this repo: Vitest + React Testing Library + MSW v2
  (including SSE stream mocking) and Playwright for Electron E2E. Use when
  writing or reviewing any test — store, hook, component, IPC contract, or
  E2E — or when setting up MSW handlers.
---

# Writing tests

Match the test type to the layer. All unit/component tests are Vitest.

## Zustand slices — test as vanilla stores

Create the store directly; never mount React to test store logic:

```ts
const store = createChatStore(); // fresh instance per test
store.getState().appendToken("hel");
expect(store.getState().streamingMessage).toBe("hel");
```

## Pure logic (shared package, SSE parser, utils)

Plain Vitest. For the IPC contract: valid payload parses, invalid payload
throws — one test per channel.

## Components & hooks — RTL + MSW v2

- MSW v2 syntax ONLY: `http.get(...)`, `HttpResponse.json(...)`. Never the
  v1 `rest`/`(req, res, ctx)` API.
- One shared server (`tests/msw/server.ts`) with
  `onUnhandledRequest: "error"` — an unmocked request is a test bug.
- Per-test overrides via `server.use(...)`; reset in `afterEach`.
- Query the DOM by role/label (`getByRole`), not test ids, unless there is
  no accessible handle. Wrap components in a fresh `QueryClient` per test
  (retry: false).

### Mocking SSE streams

MSW can stream — mock the agent's SSE endpoint with a `ReadableStream`:

```ts
http.post("*/chat/stream", () => {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode('event: token\ndata: {"text":"Hel"}\n\n'));
      controller.enqueue(enc.encode('event: token\ndata: {"text":"lo"}\n\n'));
      controller.enqueue(enc.encode('event: done\ndata: {}\n\n'));
      controller.close();
    },
  });
  return new HttpResponse(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
});
```

Test the full loop: tokens land in the Zustand slice while streaming, the
completed message lands in the Query cache on `done`, the slice resets.

## Playwright E2E (apps/desktop/tests/e2e)

Electron apps launch via `_electron`, not a browser:

```ts
import { test, expect, _electron as electron } from "@playwright/test";

test("app shows shell layout", async () => {
  const app = await electron.launch({ args: ["out/main/index.js"] });
  const window = await app.firstWindow();
  await expect(window.getByRole("navigation")).toBeVisible();
  await app.close();
});
```

- `electron-vite build` must run first (`pnpm test:e2e` handles it).
- Keep to the golden paths (launch, login, send+stream, switch
  conversation, settings) — E2E is not for edge cases.

## General rules

- One behavior per test, named after the behavior.
- No `any` in tests either; factories over fixture blobs.
- Coverage target is logic ≥80% — don't write coverage-theater tests
  (asserting mocks were called, testing implementation details).
- Run the narrow suite first (`pnpm --filter <pkg> test -- <pattern>`),
  full `pnpm check` before finishing.
