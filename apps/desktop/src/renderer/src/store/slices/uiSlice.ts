import type { StateCreator } from "zustand";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(DARK_MEDIA_QUERY).matches
  );
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
}

function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export type UiSlice = {
  sidebarOpen: boolean;
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  /** Re-resolves against the current OS preference; no-op unless theme is "system". */
  syncSystemTheme: () => void;
};

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (
  set,
  get,
) => ({
  sidebarOpen: true,
  theme: "system",
  resolvedTheme: resolveTheme("system"),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => {
    const resolvedTheme = resolveTheme(theme);
    applyResolvedTheme(resolvedTheme);
    set({ theme, resolvedTheme });
  },
  syncSystemTheme: () => {
    if (get().theme !== "system") return;
    const resolvedTheme = resolveTheme("system");
    applyResolvedTheme(resolvedTheme);
    set({ resolvedTheme });
  },
});
