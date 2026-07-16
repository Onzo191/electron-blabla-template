/**
 * JS mirror of the CSS motion tokens in styles/tokens.css
 * (--duration-* / --ease-*). motion's `m.*` transitions need plain numbers,
 * so keep these in sync with the CSS values.
 */
export const DURATION = {
  fast: 0.12,
  normal: 0.18,
  slow: 0.28,
} as const;

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
