import { _electron as electron, expect, test } from "@playwright/test";

test("app launches and shows the shell layout", async () => {
  const app = await electron.launch({ args: ["."] });
  const window = await app.firstWindow();

  await expect(
    window.getByRole("navigation", { name: "Primary" }),
  ).toBeVisible();
  await expect(
    window.getByRole("link", { name: "Conversations" }),
  ).toBeVisible();
  await expect(window.getByRole("link", { name: "Settings" })).toBeVisible();

  await app.close();
});
