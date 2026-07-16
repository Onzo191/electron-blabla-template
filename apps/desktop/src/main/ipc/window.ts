import type { BrowserWindow } from "electron";
import { registerHandler } from "./register";

const TITLE_BAR_OVERLAY_COLORS = {
  light: { color: "#fcfbf9", symbolColor: "#212121" },
  dark: { color: "#302e2b", symbolColor: "#f2f2f2" },
} as const;

/**
 * The overlay caption buttons (win32 `titleBarOverlay`) don't follow the
 * page's CSS, so the renderer pushes the resolved theme explicitly whenever
 * it changes. No-op on platforms without an overlay.
 */
export function registerWindowHandlers(
  getWindow: () => BrowserWindow | null,
): void {
  registerHandler("window:setTitleBarTheme", ({ theme }) => {
    const window = getWindow();
    if (window && process.platform === "win32") {
      window.setTitleBarOverlay(TITLE_BAR_OVERLAY_COLORS[theme]);
    }
    return { ok: true as const };
  });
}
