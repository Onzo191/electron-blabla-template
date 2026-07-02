---
globs: packages/shared/**
---

# Shared package rules

Applies to: `packages/shared/**`

- Types, Zod schemas, and pure functions only — no side effects, no I/O,
  no globals.
- Never import `electron`, `react`, or anything from `apps/`.
- Every IPC channel lives in `src/ipc-contract.ts`: channel name + request
  schema + response schema, all Zod. Change the contract first; main,
  preload, and renderer follow from it.
- Export inferred types (`z.infer`) alongside each schema; consumers import
  types from here and never redefine them.
