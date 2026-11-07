import { expect, test } from "@playwright/test";
import { fire, goto, loginAs, switchTo, trackErrors } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("governed agent workflow (golden path)", () => {
  test("PII is redacted before the planner sees it and a Case is opened", async ({ page }) => {
    const errors = trackErrors(page);
    await loginAs(page, "AGENT");
    await fire(page, "Payments gateway outage");
    const table = page.getByTestId("feed-table");
    await expect(table.getByTestId("redaction").first()).toBeVisible();
    await expect(table).not.toContainText("4111");
    await expect(table).not.toContainText("jane.doe@example.com");
    await table.getByTestId("table-row").filter({ hasText: "Gateway outage: " }).first().click();
    const dlg = page.getByRole("dialog");
    await expect(dlg.getByText(/PII items? redacted/)).toBeVisible();
    await expect(dlg.getByText("create_case").first()).toBeVisible();
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
  });

  test("entity resolution unifies name variants into one account", async ({ page }) => {
    await loginAs(page, "AGENT");
    await fire(page, "Same customer, new alias");
    await goto(page, "/accounts");
    const acme = page.getByTestId("account-card").filter({ hasText: "key: acme" });
    await expect(acme).toHaveCount(1);
    await expect(acme.getByText("ACME Corp.")).toBeVisible();
    await expect(acme.getByText("Acme Corporation").first()).toBeVisible();
  });

  test("a $25k discrepancy waits for a human; the requester cannot decide it", async ({ page }) => {
    await loginAs(page, "AGENT");
    await fire(page, "$25k invoice mismatch");
    await expect(page.getByTestId("nav-approvals-badge")).toBeVisible();
    await goto(page, "/approvals");
    await expect(page.getByText("Approver role required")).toBeVisible();
  });

  test("an approver approves; the Case lands in Salesforce and the audit trail", async ({ page }) => {
    await loginAs(page, "AGENT");
    await fire(page, "$25k invoice mismatch");
    await switchTo(page, "jane", "APPROVER");
    await goto(page, "/approvals");
    const card = page.getByTestId("approval-card").filter({ hasText: "$25,000" }).first();
    await expect(card).toBeVisible();
    await expect(card.getByText(/\d\d:\d\d/)).toBeVisible();
    await card.getByRole("button", { name: /Approve/ }).click();
    await page.getByLabel(/Decision note/).fill("Verified against ERP export");
    await page.getByRole("button", { name: "Confirm approval" }).click();
    await expect(page.getByText("create_financial_review executed").first()).toBeVisible();

    await goto(page, "/salesforce");
    await expect(page.getByTestId("case-item").filter({ hasText: "Financial review: $25,000.00" }).first()).toBeVisible();

    await goto(page, "/audit");
    await page.getByLabel("Search audit").fill("approved by jane");
    await expect(page.getByTestId("table-row").first()).toContainText("create_financial_review");
  });

  test("rejecting leaves no Case behind and is audited", async ({ page }) => {
    await loginAs(page, "AGENT");
    await fire(page, "$25k invoice mismatch");
    await switchTo(page, "jane", "APPROVER");
    await goto(page, "/approvals");
    await page.getByTestId("approval-card").first().getByRole("button", { name: /Reject/ }).click();
    await page.getByLabel(/Decision note/).fill("Duplicate invoice");
    await page.getByRole("button", { name: "Confirm rejection" }).click();
    await goto(page, "/audit");
    await page.getByLabel("Decision filter").selectOption("rejected");
    await expect(page.getByTestId("table-row").first()).toContainText("Duplicate invoice");
  });
});
