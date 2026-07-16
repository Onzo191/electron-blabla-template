import {
  type ChatSlice,
  createChatSlice,
} from "@renderer/features/chat/store/chatSlice";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { i18next } from "../i18n";
import {
  createUiSlice,
  DARK_MEDIA_QUERY,
  type UiSlice,
} from "./slices/uiSlice";

export type AppStore = UiSlice & ChatSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createUiSlice(...args),
      ...createChatSlice()(...args),
    }),
    {
      name: "myvng-ui-prefs",
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);

// Re-apply persisted (or default) UI prefs: createUiSlice/persist only set
// state, they don't touch the DOM class or i18next.
useAppStore.getState().setTheme(useAppStore.getState().theme);
void i18next.changeLanguage(useAppStore.getState().language);

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  window
    .matchMedia(DARK_MEDIA_QUERY)
    .addEventListener("change", () => useAppStore.getState().syncSystemTheme());
}
