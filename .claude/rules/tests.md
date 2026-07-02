---
globs: "**/*.test.{ts,tsx}"
---

# Test rules

Applies to: `**/*.test.ts`, `**/*.test.tsx`

- Vitest + React Testing Library for unit/component tests; Playwright only
  under `apps/desktop/tests/e2e/`.
- Mock the backend with MSW (it can mock SSE too) — never stub
  `fetch` by hand.
- Test Zustand slices as vanilla stores (create the store directly), not
  through components.
- Query the DOM by role/label (`getByRole`), not by class or test id,
  unless there is no accessible handle.
- One behavior per test; name it after the behavior, not the function.
