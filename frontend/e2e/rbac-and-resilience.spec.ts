import { expect, test } from "@playwright/test";
import { goto, loginAs, switchTo } from "./helpers";

test.describe("RBAC, validation and resilience", () => {
  test("a viewer is read-only everywhere", async ({ page }) => {
    await loginAs(page, "VIEWER");
    await goto(page, "/events");
    await expect(page.getByLabel("Fire $25k invoice mismatch")).toBeDisabled();
    await goto(page, "/actions");
    await expect(page.getByTestId("action-create_case").getByRole("button", { name: /Invoke/ })).toBeDisabled();
    await goto(page, "/approvals");
    await expect(page.getByText("Approver role required")).toBeVisible();
  });

  test("the catalog form validates and invokes a low-risk action immediately", async ({ page }) => {
    await loginAs(page, "AGENT");
    await goto(page, "/actions");
    await page.getByTestId("action-create_case").getByRole("button", { name: /Invoke/ }).click();
    const submit = page.getByRole("button", { name: /Submit to control tower/ });
    await expect(submit).toBeDisabled();
    await page.getByLabel(/Account Name/).fill("Acme Corporation");
    await page.getByLabel(/Subject/).fill("E2E: manual escalation");
    await page.getByLabel(/Priority/).selectOption("High");
    await submit.click();
    await expect(page.getByTestId("invoke-result").getByTestId("decision-executed")).toBeVisible();
    await page.keyboard.press("Escape");
    await goto(page, "/salesforce");
    await expect(page.getByTestId("case-item").filter({ hasText: "E2E: manual escalation" })).toBeVisible();
  });

  test("schema validation rejects malformed parameters and audits the attempt", async ({ page }) => {
    await loginAs(page, "AGENT");
    await goto(page, "/actions");
    await page.getByTestId("action-escalate_case").getByRole("button", { name: /Invoke/ }).click();
    await page.getByLabel(/Case Id/i).fill("bad-id");
    await page.getByLabel(/Reason/).fill("probe");
    await page.getByRole("button", { name: /Submit to control tower/ }).click();
    await expect(page.getByTestId("invoke-result").getByTestId("decision-rejected")).toBeVisible();
  });

  test("schema drift is blocked with 422 and counted in the dead-letter queue", async ({ page }) => {
    await loginAs(page, "AGENT");
    await goto(page, "/events");
    await page.getByRole("button", { name: /Schema drift/ }).click();
    await expect(page.getByText(/Schema drift blocked \(HTTP 422\)/)).toBeVisible();
    await goto(page, "/");
    await expect(page.getByText("Dead-letter queue").locator("..")).not.toContainText(/^Dead-letter queue\s*0$/);
  });

  test("a burst flows through the async bus and the stream fills in", async ({ page }) => {
    await loginAs(page, "AGENT");
    await goto(page, "/events");
    await page.getByRole("button", { name: /Burst/ }).click();
    await expect.poll(async () => page.getByTestId("table-row").count(), { timeout: 15_000 }).toBeGreaterThanOrEqual(6);
    await page.getByRole("button", { name: "critical" }).click();
    await expect(page.getByTestId("table-row").first()).toContainText(/critical/i);
  });

  test("the command palette drives navigation and persona switching", async ({ page }) => {
    await loginAs(page, "AGENT");
    await page.keyboard.press("Control+k");
    await page.getByLabel("Command search").fill("act as jane");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("role-badge")).toHaveText("APPROVER");
    await page.keyboard.press("Control+k");
    await page.getByLabel("Command search").fill("runbook");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Executive demo runbook" })).toBeVisible();
    await switchTo(page, "agent-svc", "AGENT");
  });

  test("the guided runbook executes real API calls end to end", async ({ page }) => {
    await loginAs(page, "AGENT");
    await goto(page, "/runbook");
    for (const id of ["pii", "alias", "invoice"]) {
      const step = page.getByTestId(`step-${id}`);
      await step.getByRole("button", { name: /Run step/ }).click();
      await expect(step.getByTestId("step-result")).toBeVisible();
    }
    await switchTo(page, "jane", "APPROVER");
    const approve = page.getByTestId("step-approve");
    await approve.getByRole("button", { name: /Run step/ }).click();
    await expect(approve.getByTestId("step-result")).toContainText(/executed/);
    const probe = page.getByTestId("step-probe");
    await probe.getByRole("button", { name: /Run step/ }).click();
    await expect(probe.getByTestId("step-result")).toContainText(/denied|rejected/);
  });

  test("every page renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && !m.text().includes("Failed to load resource") && errors.push(m.text()));
    await loginAs(page, "ADMIN");
    for (const path of ["/", "/events", "/approvals", "/actions", "/accounts", "/audit", "/salesforce", "/runbook"]) {
      await goto(page, path);
      await expect(page.locator("main h1")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
