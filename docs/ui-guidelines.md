# UI Guidelines — Tailwind CSS v4 + Chakra UI v3

The renderer uses two styling systems with a strict ownership split. This
doc records what each owns, how they share design tokens, and how dark
mode stays in sync. For the actual token values (color scale, type scale,
motion, golden-ratio layout guidance) see `docs/design-system.md`. The
enforceable subset lives in `.claude/rules/ui.md`; the hands-on workflow is
the `/build-ui` skill.

## Why both

- **Chakra UI v3** gives us accessible, keyboard-navigable interactive
  components (Dialog, Menu, Tooltip, form controls) with focus management
  and ARIA handled — the part that is expensive to hand-roll correctly.
- **Tailwind v4** is the fastest way to express layout, spacing, and
  one-off styling on plain elements, and keeps that styling colocated
  with markup.

What we deliberately do NOT do is treat them as interchangeable. Every
element is styled by exactly one system.

## Ownership split

| Concern                                            | Owner    |
| -------------------------------------------------- | -------- |
| Buttons, inputs, selects, checkboxes, form fields  | Chakra   |
| Dialog/Drawer, Menu, Tooltip, Popover, Toast       | Chakra   |
| Page/feature layout (flex, grid, spacing, sizing)  | Tailwind |
| Typography on plain text elements                  | Tailwind |
| One-off decorative styling (borders, shadows)      | Tailwind |
| Scroll containers, virtualized lists' outer frame  | Tailwind |

Rule of thumb: if it has state, focus behavior, or ARIA semantics, it is
a Chakra component styled with Chakra props. If it is a `div`/`span`/
heading, it gets Tailwind classes. Never both on one element.

## Design tokens — single source of truth

Tokens are plain CSS variables in
`apps/desktop/src/renderer/src/styles/tokens.css`:

```css
:root {
  --brand-500: oklch(0.7 0.185 45); /* current accent theme: orange */
  --accent: var(--brand-500);
  --radius-md: 0.625rem;
  /* ... */
}
.dark {
  --surface: oklch(0.19 0.006 60);
}
```

Both systems consume them, neither redefines them:

- **Tailwind v4** maps them in the `@theme` block of the entry CSS, so
  `bg-brand-500` etc. resolve to the variables.
- **Chakra v3** maps them in `createSystem(defaultConfig, ...)` token
  config using `var(--brand-500)` values.

Adding a color/spacing/radius = add the variable, wire it into both maps.
Never hardcode hex/px values in components. Full token reference (color
scale, type scale, shadows, motion, golden-ratio layout tokens, and the
accent-theming mechanism) lives in `docs/design-system.md` — this doc
stays focused on the Chakra/Tailwind split.

## Global reset & layers

Chakra's provider ships the global reset, so Tailwind preflight stays
off. The renderer entry CSS imports Tailwind's theme and utilities layers
only:

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@import "./tokens.css";
```

## Dark mode

Class-based, one switch:

- `<html class="dark">` is the only signal. It is toggled by the
  `uiSlice` theme action (and persisted via the settings IPC channel).
- Tailwind uses the `dark:` variant configured against that class.
- Chakra's color mode is driven by the same class (className-based
  color-mode adapter, not its own storage/listener).

Never read or write color mode through a second mechanism.

## Component conventions

- Shared, feature-agnostic wrappers (e.g. our standard `Button` with the
  project's default variant/size) live in
  `src/renderer/src/shared/components/`; feature-private components live
  in the feature folder.
- Wrappers re-export a constrained surface, they don't re-style Chakra
  from scratch. Variants belong in the Chakra recipe/theme config, not in
  per-call-site prop soup. Exception (documented): custom recipe variants
  require Chakra's typegen step, which this repo doesn't run — reusable
  looks are shared wrapper components instead (`ChipButton`,
  `GhostIconButton`, `SegmentedControl` in `shared/components/`).
- Function declarations, named exports (repo-wide rule).

## Motion & animation

Library: `motion` v12, loaded via `LazyMotion features={domAnimation}` +
`m.*` components, with `<MotionConfig reducedMotion="user">` app-wide.
Strict split — never double-animate:

- **motion**: things CSS can't do — list reorder (`<m.li layout>` on
  sidebar pin/unpin), enter/exit (`AnimatePresence` for the
  scroll-to-bottom button, lightbox crossfade), new-message entrance.
- **CSS keyframes** (`app.css`): loops — typing dots (`chat-bounce`),
  streaming cursor blink, shimmer. All guarded by
  `prefers-reduced-motion`.
- **Plain CSS `transition`**: simple state-driven property changes —
  hover/focus tints (the `.interactive` utility class), the
  sidebar-collapse grid track (`.sidebar-track`). Uses the
  `--duration-*`/`--ease-*` tokens directly; see `docs/design-system.md`.
- **Chakra built-ins**: Dialog/Menu/Tooltip/Collapsible transitions stay
  Chakra's — don't wrap them in motion.

Keep it minimalist: tweens of 120–280ms (the `--duration-*` tokens),
standard easing, no springs. `shared/lib/motion.ts` mirrors the CSS
duration tokens as plain numbers for `m.*` components.

## Testing

Chakra components render real ARIA roles, so RTL queries stay
role/label-based (`getByRole("dialog")`, `getByRole("menuitem")`) per
`.claude/rules/tests.md`. Wrap rendered components in the app's Chakra
provider via the shared test `renderWithProviders` helper.
