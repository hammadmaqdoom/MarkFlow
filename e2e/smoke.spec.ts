import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("landing page loads and shows CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /MarkFlow/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Get started/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign in/i })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
