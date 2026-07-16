import { _electron as electron } from "@playwright/test";

const app = await electron.launch({ args: ["."], cwd: process.cwd() });
const window = await app.firstWindow();
await window.waitForTimeout(1500);
await window.screenshot({ path: process.argv[2] || "screenshot-light.png" });

// Toggle dark mode via Cmd/Ctrl+B is sidebar; open settings to switch theme instead.
await app.close();
