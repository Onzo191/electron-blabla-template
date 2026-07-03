import { createSystem, defaultConfig } from "@chakra-ui/react";

/**
 * Chakra's `_dark` condition already targets `.dark &` by default, so
 * toggling `document.documentElement.classList` (done by `uiSlice`) is
 * enough to flip both Chakra and Tailwind styling — no ColorModeProvider
 * or extra listener needed.
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
      },
      radii: {
        md: { value: "var(--radius-md)" },
      },
    },
    semanticTokens: {
      colors: {
        text: {
          value: "var(--text)",
        },
      },
    },
  },
});
