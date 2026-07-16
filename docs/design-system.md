# Design System

The visual standard for the renderer: color, type, spacing, motion, and
layout tokens, plus the rules that keep new features consistent with the
rest of the app. This is the detailed reference; `docs/ui-guidelines.md`
covers the Chakra-vs-Tailwind ownership split and stays the place to check
first for "which system styles this element". `.claude/rules/ui.md` is the
enforceable subset for both.

All tokens are plain CSS custom properties in
`apps/desktop/src/renderer/src/styles/tokens.css`, mapped into Tailwind's
`@theme` block (`styles/app.css`) and into Chakra's `createSystem` config
(`theme/system.ts`). Adding a token is always three touches, in that order.
Never hardcode a color, radius, shadow, or duration in a component.

## Color

### Accent theming

Components never reference a hue directly — only semantic slots:

```css
--accent          /* default interactive color */
--accent-emphasis /* hover/pressed state */
--accent-subtle   /* tinted background (selected rows, badges) */
--accent-fg       /* text/icon color placed on top of --accent */
```

These slots resolve against a `--brand-50` … `--brand-900` scale. The
current theme is **orange**. A future accent theme (e.g. a user-facing
color picker) is a single CSS block that reassigns the brand scale, keyed
off a `data-accent` attribute on `<html>` alongside the existing `.dark`
class — no component or JS changes required:

```css
[data-accent="blue"] {
  --brand-500: oklch(0.62 0.19 255);
  /* ...50–900 */
}
.dark[data-accent="blue"] {
  --accent: var(--brand-400);
  /* ... */
}
```

Until a picker ships, `:root`/`.dark` in `tokens.css` *is* the "orange"
theme — there's no `data-accent="orange"` block to duplicate.

### Neutrals & semantics

- `--surface`, `--surface-100`, `--surface-200`, `--surface-raised` — warm
  neutrals (hue ~70, chroma ≤ 0.01) so grays harmonize with the orange
  accent instead of reading blue-gray.
- `--text`, `--text-muted`, `--text-faint` — foreground scale.
- `--border-subtle` — the only border color; don't invent a second.
- `--success`, `--warning`, `--danger`, `--info` — status colors, one each.
- `--bubble-user` / `--bubble-user-text` — chat-specific, kept separate
  from `--accent` so the user bubble tint can diverge from the accent hue.

Every color has a `.dark` override. When adding a new semantic slot, add
both.

## Typography

- `--font-sans` — the body/UI font: a system-font stack
  (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`) chosen
  because SF Pro (macOS) and Segoe UI (Windows) both render Vietnamese
  correctly. Don't introduce a webfont without checking Vietnamese diacritic
  coverage first.
- `--font-mono` — code and monospace UI.
- Scale: `--text-xs` (0.75rem) → `--text-2xl` (1.5rem). Chat body text is
  `--text-md` (0.9375rem) — use it instead of an arbitrary `text-[15px]`.
- `--leading-body` (1.6) is the default paragraph line-height — generous on
  purpose, close to the golden ratio's reciprocal-adjacent feel and good
  for scanability in long assistant responses. `--leading-tight` (1.25) is
  for headings.

## Radii, shadows, z-index

- Radii run `--radius-sm` (0.375rem) → `--radius-2xl` (1.75rem), softer and
  rounder than a typical UI kit — this app should read as friendly, not
  boxy. Prefer `lg`/`xl` for cards and bubbles, `sm`/`md` for inline
  controls.
- Shadows (`--shadow-xs` → `--shadow-lg`) are subtle and layered (two
  offsets, low alpha). Dark mode shadows lean on plain black instead of a
  tinted color and are used more sparingly — borders (`--border-subtle`)
  do more of the separation work in dark mode.
- Z-index is a fixed scale: `--z-dropdown` (10) < `--z-titlebar` (20) <
  `--z-overlay` (40) < `--z-toast` (50). Don't pick an arbitrary number;
  extend the scale if a new layer is needed.

## Motion

Duration and easing are tokens, not magic numbers:

```css
--duration-fast: 120ms;    /* micro-interactions: hover, toggle */
--duration-normal: 180ms;  /* enter/exit, section switches */
--duration-slow: 280ms;    /* layout changes: sidebar collapse */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

`shared/lib/motion.ts` mirrors these as plain numbers (`DURATION.fast` =
`0.12`, etc.) for `motion`'s `m.*` components, which take seconds, not CSS
duration strings. Keep the two in sync if either changes.

The tool split from `docs/ui-guidelines.md` still applies: `motion` for
enter/exit/reorder, CSS keyframes for loops, plain CSS `transition` (using
the duration/ease tokens, e.g. the `.interactive` utility class in
`app.css`) for simple state-driven property changes like hover tints and
the sidebar-collapse grid track. Don't animate the same property with two
different tools.

## Layout & the golden ratio

Two flexible layout tokens replace the old fixed pixel values:

- `--sidebar-width` (17rem) — the sidebar's open width. It's a CSS grid
  track (`routes/chat.tsx`), so collapsing it to `0` and animating
  `grid-template-columns` is a single declarative transition, not manual
  width math.
- `--content-max-width` (46rem) — the reading column for chat messages,
  input, and the landing page (Tailwind `max-w-content`).
- `--titlebar-height` (2.375rem) — the frameless-window drag strip
  (Tailwind `h-titlebar`).

The golden ratio (`--ratio-golden: 1.618`) shows up where it improves
visual weight without hurting usability — it is a finishing touch, not a
constraint applied everywhere:

- **Landing hero position**: the greeting/prompt block sits at the golden
  section (~38.2% down the available space) instead of dead center. Done
  with two flex spacers sized `grow-[0.382]` / `grow-[0.618]` around the
  content (`ChatLanding.tsx`) — proportional, so it holds at any window
  size instead of a fixed offset.
- **User bubble width**: capped at `61.8%` of the content column
  (`max-w-[61.8%]`) rather than a fixed character count, so it scales with
  the reading column instead of breaking at an arbitrary px width.
- **Body line-height** (1.6): not a literal golden-ratio value, but chosen
  in that generous, reciprocal-adjacent range for readability.

Don't reach for 38.2%/61.8% splits on dense UI (settings rows, sidebar
items, toolbars) — those want ordinary, tight, utilitarian spacing. The
ratio is for the few places where the layout has open space to compose.

## Component conventions

Same rule as `docs/ui-guidelines.md`: no custom Chakra recipe variants
(the repo doesn't run typegen), so a recurring look is a shared wrapper in
`shared/components/` — `ChipButton`, `GhostIconButton`, and now
`SegmentedControl` (thin wrapper over Chakra's `SegmentGroup`, used for
theme/language pickers) and `TitleBar` (frameless-window drag strip).
`features/settings/components/SettingsRow.tsx` is the feature-local
equivalent for a labeled settings row — copy that pattern for any new
settings-like list rather than inventing another row layout.

## New-feature checklist

- Every color/radius/shadow/duration comes from a token — no hardcoded hex,
  px, or `duration: 0.2` in a component.
- Interactive elements are Chakra; layout and one-off styling are Tailwind;
  never both on one element.
- New strings go in `i18n/locales/{en,vi}.json` under the `aiAgents`
  namespace — see `settings.*` for the current shape.
- If it's a recurring look, check `shared/components/` before writing a
  new one-off.
- `pnpm check` passes; component tests query by role/label through
  `renderWithProviders` (see `.claude/rules/tests.md`).
