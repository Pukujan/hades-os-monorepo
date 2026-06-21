import { expect, test } from "playwright/test";

test("renders the Hades frontend shell", async ({ page }) => {
  await page.route("**/api/auth/browser-config", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        supabaseUrl: "",
        supabaseAnonKey: "",
        appUrl: "http://127.0.0.1:4173",
      }),
    });
  });

  await page.goto("/");

  await expect(page).toHaveTitle(/Litigation Workflow Workspace/i);
  await expect(page.getByRole("heading", { name: /HADES OS/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /START THE FORGE/i })).toBeVisible();
});