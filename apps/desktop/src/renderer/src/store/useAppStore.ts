import { create } from "zustand";
import {
  createUiSlice,
  DARK_MEDIA_QUERY,
  type UiSlice,
} from "./slices/uiSlice";

export type AppStore = UiSlice;

export const useAppStore = create<AppStore>()((...args) => ({
  ...createUiSlice(...args),
}));

// Apply the initial resolved theme to the DOM (createUiSlice only sets state)
// and keep "system" mode in sync with OS-level preference changes.
useAppStore.getState().setTheme(useAppStore.getState().theme);

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  window
    .matchMedia(DARK_MEDIA_QUERY)
    .addEventListener("change", () => useAppStore.getState().syncSystemTheme());
}
