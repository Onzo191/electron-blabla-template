import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import { createUiSlice, type UiSlice } from "./uiSlice";

function mockMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function setup() {
  return createStore<UiSlice>()((...args) => createUiSlice(...args));
}

describe("uiSlice", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("toggles sidebar open state", () => {
    const store = setup();

    store.getState().toggleSidebar();

    expect(store.getState().sidebarOpen).toBe(false);
  });

  it("applies the dark class when theme is set to dark", () => {
    const store = setup();

    store.getState().setTheme("dark");

    expect(store.getState().resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes the dark class when theme is set to light", () => {
    const store = setup();

    store.getState().setTheme("dark");
    store.getState().setTheme("light");

    expect(store.getState().resolvedTheme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("resolves system theme from the OS preference", () => {
    mockMatchMedia(true);
    const store = setup();

    store.getState().setTheme("system");

    expect(store.getState().resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("re-resolves system theme on sync, but only while in system mode", () => {
    mockMatchMedia(false);
    const store = setup();
    store.getState().setTheme("system");
    expect(store.getState().resolvedTheme).toBe("light");

    mockMatchMedia(true);
    store.getState().syncSystemTheme();
    expect(store.getState().resolvedTheme).toBe("dark");

    store.getState().setTheme("light");
    mockMatchMedia(false);
    store.getState().syncSystemTheme();
    expect(store.getState().resolvedTheme).toBe("light");
  });

  it("opens settings to the given section, defaulting to the current one", () => {
    const store = setup();

    store.getState().openSettings("account");
    expect(store.getState()).toMatchObject({
      settingsOpen: true,
      settingsSection: "account",
    });

    store.getState().closeSettings();
    store.getState().openSettings();
    expect(store.getState()).toMatchObject({
      settingsOpen: true,
      settingsSection: "account",
    });
  });

  it("closes settings", () => {
    const store = setup();
    store.getState().openSettings("about");

    store.getState().closeSettings();

    expect(store.getState().settingsOpen).toBe(false);
  });
});
