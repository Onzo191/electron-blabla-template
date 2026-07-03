# UI styling rules

Applies to: `apps/desktop/src/renderer/**/*.tsx`, `apps/desktop/src/renderer/**/*.css`

- Chakra UI owns interactive/stateful components: Button, Input, Dialog,
  Menu, Tooltip, Toast, form controls. Never hand-roll one of these out of
  divs — accessibility comes from Chakra.
- Tailwind owns layout and one-off styling: flex/grid, spacing, sizing,
  typography on plain elements.
- One styling system per element: a Chakra component gets Chakra props, a
  plain element gets Tailwind classes. Never put Tailwind utility classes
  and Chakra style props on the same element.
- Design tokens (colors, spacing, radii) are defined once as CSS variables
  in `src/renderer/src/styles/tokens.css`; the Tailwind `@theme` block and
  the Chakra `createSystem` config both reference them. Never hardcode a
  hex color or px value in a component.
- Dark mode is class-based (`.dark` on `<html>`): Chakra color mode and
  the Tailwind `dark:` variant key off the same class, toggled only via
  the `uiSlice` theme action.
- Chakra owns the global CSS reset; import Tailwind without preflight
  (theme + utilities layers only).
- No other styling systems: no styled-components, no CSS modules, no
  inline `style={}` except for values computed at runtime (e.g.
  virtualizer offsets).
