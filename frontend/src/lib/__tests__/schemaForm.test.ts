import { fieldsFromSchema, missingRequired, paramsFromValues } from "../schemaForm";
import { manifest } from "@/test/server";

describe("schemaForm", () => {
  const create = fieldsFromSchema(manifest[0].inputSchema);
  const fin = fieldsFromSchema(manifest[1].inputSchema);

  it("maps JSON schema types to field kinds", () => {
    expect(create.map((f) => f.kind)).toEqual(["text", "text", "textarea", "select"]);
    expect(fin.find((f) => f.name === "amount_usd")).toMatchObject({ kind: "number", required: true, hint: "must be > 0" });
  });
  it("carries enum options and defaults", () => {
    expect(create.find((f) => f.name === "priority")).toMatchObject({ options: ["Low", "Medium", "High"], defaultValue: "Medium" });
  });
  it("hints Salesforce id pattern", () => {
    const f = fieldsFromSchema({ properties: { case_id: { type: "string", pattern: "^x$" } } });
    expect(f[0].hint).toMatch(/Salesforce Id/);
  });
  it("coerces numbers and drops empty values", () => {
    expect(paramsFromValues(fin, { account_name: " Globex ", amount_usd: "25000", reason: "" })).toEqual({ account_name: "Globex", amount_usd: 25000 });
  });
  it("reports missing required labels", () => {
    expect(missingRequired(fin, { account_name: "x" })).toEqual(["Amount Usd", "Reason"]);
  });
});
