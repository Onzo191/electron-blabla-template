import { _electron as electron, expect, test } from "@playwright/test";

test("app launches and shows the chat shell", async () => {
  const app = await electron.launch({ args: ["."] });
  const window = await app.firstWindow();

  // "/" redirects to /chat: agent picker header, conversation list, composer.
  await expect(
    window.getByRole("navigation", { name: /conversations|trò chuyện/i }),
  ).toBeVisible();
  await expect(window.getByRole("textbox")).toBeVisible();

  await app.close();
});
