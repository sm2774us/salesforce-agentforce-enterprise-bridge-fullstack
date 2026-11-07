import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("authentication", () => {
  test("unauthenticated deep links bounce to login", async ({ page }) => {
    await page.goto("/#/login");
    await page.evaluate(() => sessionStorage.clear());
    await page.goto("/#/approvals");
    await expect(page.getByLabel("Bridge API key")).toBeVisible();
  });

  test("a wrong API key is rejected by the real backend", async ({ page }) => {
    await page.goto("/#/login");
    await page.getByLabel("Bridge API key").fill("definitely-wrong");
    await page.getByRole("button", { name: "Enter control tower" }).click();
    await expect(page.getByRole("alert")).toContainText("not recognised");
  });

  test("a valid key signs in, survives reload, and signs out", async ({ page }) => {
    await page.goto("/#/login");
    await page.evaluate(() => sessionStorage.clear());
    await page.goto("/#/login");
    await page.getByLabel("Bridge API key").fill("agent-key");
    await page.getByRole("button", { name: "Enter control tower" }).click();
    await expect(page.getByRole("heading", { name: "Mission control" })).toBeVisible();
    await expect(page.getByTestId("mode-badge")).toHaveText(/Offline CRM/);
    await page.reload();
    await expect(page.getByTestId("role-badge")).toHaveText("AGENT");
    await page.getByTestId("persona-trigger").click();
    await page.getByRole("menuitem", { name: /Sign out/ }).click();
    await expect(page.getByLabel("Bridge API key")).toBeVisible();
  });

  test("every demo persona resolves to its server-side role", async ({ page }) => {
    for (const role of ["VIEWER", "APPROVER", "ADMIN", "AGENT"] as const) await loginAs(page, role);
  });
});
