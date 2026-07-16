---
name: build-ui
description: >
  Build or restyle renderer UI with Chakra UI v3 + Tailwind v4. Use when
  creating/editing components in apps/desktop/src/renderer, choosing
  between a Chakra component and Tailwind classes, adding design tokens,
  theming/variants, or touching dark mode. Encodes the one-system-per-
  element rule and the shared token pipeline.
---

# Build UI (Chakra UI v3 + Tailwind v4)

Full rationale: `docs/ui-guidelines.md`. Token values, color scale, motion
tokens, and golden-ratio layout guidance: `docs/design-system.md`.
Enforced subset: `.claude/rules/ui.md`.

## Decide the owner first

- Interactive / stateful / ARIA-bearing (button, input, dialog, menu,
  tooltip, toast, form field) → **Chakra component, Chakra props**.
- Layout, spacing, typography, decoration on plain elements → **Tailwind
  classes**.
- Never mix both on one element. Composition is fine: a Tailwind-styled
  `div` wrapping a Chakra `Button` is the normal shape.

```tsx
export function ConversationHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-surface-200 px-4 py-2">
      <h1 className="truncate text-sm font-medium">{title}</h1>
      <Menu.Root>
        <Menu.Trigger asChild>
          <IconButton aria-label="Conversation actions" size="sm" variant="ghost">
            <EllipsisIcon />
          </IconButton>
        </Menu.Trigger>
        {/* ... */}
      </Menu.Root>
    </header>
  );
}
```

## Tokens

New color/spacing/radius = three touches, in order:

1. CSS variable in `src/renderer/src/styles/tokens.css` (plus a `.dark`
   override if the value differs by mode).
2. Tailwind `@theme` mapping in the entry CSS.
3. Chakra `createSystem` token mapping referencing the same
   `var(--...)`.

Never hardcode hex/px in a component; if the value isn't a token yet,
make it one.

## Variants & shared components

- Recurring look for a Chakra component → define a recipe/variant in the
  Chakra system config, not repeated props at call sites.
- Feature-agnostic wrappers live in `src/renderer/src/shared/components/`;
  feature-private ones in `features/<name>/components/`. Function
  declarations, named exports.

## Dark mode

`<html class="dark">` is the only signal, toggled only via the `uiSlice`
theme action. Tailwind `dark:` variant and Chakra color mode both key off
that class. Don't add listeners, storage, or `useColorMode`-style state
elsewhere.

## Done checklist

- [ ] Every element styled by exactly one system (no `className` +
      style-props mixes)
- [ ] Interactive elements are Chakra components (no div-buttons)
- [ ] No hardcoded colors/sizes — tokens only
- [ ] Works in both light and dark (`.dark` class toggle)
- [ ] Component test queries by role/label, rendered through
      `renderWithProviders`
- [ ] `pnpm check` passes
