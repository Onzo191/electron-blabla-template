import { _electron as electron, expect, test } from "@playwright/test";

test("app launches and shows a window", async () => {
  const app = await electron.launch({ args: ["."] });
  const window = await app.firstWindow();
  await expect(window.locator("body")).toBeVisible();
  expect(await window.title()).not.toBe("");
  await app.close();
});
