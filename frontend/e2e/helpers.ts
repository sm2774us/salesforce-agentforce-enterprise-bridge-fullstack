import { expect, type Page } from "@playwright/test";

export type Persona = "AGENT" | "APPROVER" | "VIEWER" | "ADMIN";

export async function loginAs(page: Page, role: Persona) {
  await page.goto("/#/login");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload(); // drop the in-memory store too
  await page.getByTestId(`persona-${role}`).click();
  await expect(page.getByRole("heading", { name: "Mission control" })).toBeVisible();
  await expect(page.getByTestId("role-badge")).toHaveText(role);
}

export async function switchTo(page: Page, name: string, role: Persona) {
  await page.getByTestId("persona-trigger").click();
  await page.getByRole("menuitem", { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByTestId("role-badge")).toHaveText(role);
}

export const goto = (page: Page, path: string) => page.goto(`/#${path}`);

export async function fire(page: Page, title: string) {
  await goto(page, "/events");
  const btn = page.getByLabel(`Fire ${title}`);
  await expect(btn).toBeEnabled();
  await btn.click();
}

export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource")) errors.push(m.text());
  });
  return errors;
}
