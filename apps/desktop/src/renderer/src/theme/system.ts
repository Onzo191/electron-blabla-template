import { createSystem, defaultConfig } from "@chakra-ui/react";

/**
 * Chakra's `_dark` condition already targets `.dark &` by default, so
 * toggling `document.documentElement.classList` (done by `uiSlice`) is
 * enough to flip both Chakra and Tailwind styling — no ColorModeProvider
 * or extra listener needed.
 *
 * Reusable button looks (chip, muted icon action) live as shared wrapper
 * components in `shared/components/` rather than recipe variants: custom
 * recipe variants require the Chakra typegen step to be type-safe, which
 * this repo does not run.
 */
export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          500: { value: "var(--brand-500)" },
          600: { value: "var(--brand-600)" },
        },
        surface: {
          50: { value: "var(--surface)" },
          100: { value: "var(--surface-100)" },
          200: { value: "var(--surface-200)" },
        },
        surfaceRaised: { value: "var(--surface-raised)" },
        bubbleUser: { value: "var(--bubble-user)" },
        bubbleUserText: { value: "var(--bubble-user-text)" },
        borderSubtle: { value: "var(--border-subtle)" },
        accent: { value: "var(--accent)" },
        success: { value: "var(--success)" },
        danger: { value: "var(--danger)" },
      },
      radii: {
        md: { value: "var(--radius-md)" },
        lg: { value: "var(--radius-lg)" },
        xl: { value: "var(--radius-xl)" },
        full: { value: "var(--radius-full)" },
      },
      fonts: {
        mono: { value: "var(--font-mono)" },
      },
    },
    semanticTokens: {
      colors: {
        text: {
          value: "var(--text)",
        },
        textMuted: {
          value: "var(--text-muted)",
        },
        textFaint: {
          value: "var(--text-faint)",
        },
      },
    },
  },
});
