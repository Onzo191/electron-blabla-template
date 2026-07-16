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
          50: { value: "var(--brand-50)" },
          100: { value: "var(--brand-100)" },
          200: { value: "var(--brand-200)" },
          300: { value: "var(--brand-300)" },
          400: { value: "var(--brand-400)" },
          500: { value: "var(--brand-500)" },
          600: { value: "var(--brand-600)" },
          700: { value: "var(--brand-700)" },
          800: { value: "var(--brand-800)" },
          900: { value: "var(--brand-900)" },
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
        accentEmphasis: { value: "var(--accent-emphasis)" },
        accentSubtle: { value: "var(--accent-subtle)" },
        accentFg: { value: "var(--accent-fg)" },
        success: { value: "var(--success)" },
        warning: { value: "var(--warning)" },
        danger: { value: "var(--danger)" },
        info: { value: "var(--info)" },
      },
      radii: {
        sm: { value: "var(--radius-sm)" },
        md: { value: "var(--radius-md)" },
        lg: { value: "var(--radius-lg)" },
        xl: { value: "var(--radius-xl)" },
        "2xl": { value: "var(--radius-2xl)" },
        full: { value: "var(--radius-full)" },
      },
      fonts: {
        body: { value: "var(--font-sans)" },
        heading: { value: "var(--font-sans)" },
        mono: { value: "var(--font-mono)" },
      },
      shadows: {
        xs: { value: "var(--shadow-xs)" },
        sm: { value: "var(--shadow-sm)" },
        md: { value: "var(--shadow-md)" },
        lg: { value: "var(--shadow-lg)" },
      },
      durations: {
        fast: { value: "var(--duration-fast)" },
        normal: { value: "var(--duration-normal)" },
        slow: { value: "var(--duration-slow)" },
      },
      easings: {
        out: { value: "var(--ease-out)" },
        inOut: { value: "var(--ease-in-out)" },
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
