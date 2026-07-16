import type { StateCreator } from "zustand";
import { DEFAULT_LANGUAGE, i18next, type Language } from "../../i18n";

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
  // The win32 titlebar overlay's caption buttons are OS-drawn and don't
  // follow page CSS; no-op on other platforms (see main/ipc/window.ts).
  // `window.api` is absent outside the Electron preload context (tests).
  if (window.api?.platform === "win32") {
    void window.api.invoke("window:setTitleBarTheme", { theme: resolved });
  }
}

export type SettingsSection =
  | "appearance"
  | "language"
  | "account"
  | "updates"
  | "about";

export type UiSlice = {
  sidebarOpen: boolean;
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  language: Language;
  settingsOpen: boolean;
  settingsSection: SettingsSection;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  /** Re-resolves against the current OS preference; no-op unless theme is "system". */
  syncSystemTheme: () => void;
  openSettings: (section?: SettingsSection) => void;
  closeSettings: () => void;
};

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (
  set,
  get,
) => ({
  sidebarOpen: true,
  theme: "system",
  resolvedTheme: resolveTheme("system"),
  language: DEFAULT_LANGUAGE,
  settingsOpen: false,
  settingsSection: "appearance",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLanguage: (language) => {
    void i18next.changeLanguage(language);
    set({ language });
  },
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
  openSettings: (section) =>
    set((state) => ({
      settingsOpen: true,
      settingsSection: section ?? state.settingsSection,
    })),
  closeSettings: () => set({ settingsOpen: false }),
});
