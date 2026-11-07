import type { InputSchema, JsonSchemaProp } from "./types";

export interface FieldSpec {
  name: string;
  label: string;
  kind: "text" | "textarea" | "number" | "select";
  required: boolean;
  options?: string[];
  hint?: string;
  placeholder?: string;
  defaultValue: string;
}

/** Derives a flat form description from an action's JSON schema. */
export function fieldsFromSchema(schema: InputSchema): FieldSpec[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, p]) => {
    const isNum = p.type === "number" || p.type === "integer";
    const long = (p.maxLength ?? 0) > 500;
    const kind: FieldSpec["kind"] = p.enum
      ? "select"
      : isNum
        ? "number"
        : long
          ? "textarea"
          : "text";
    return {
      name,
      label: p.title ?? name,
      kind,
      required: required.has(name),
      options: p.enum,
      hint: hintFor(p),
      placeholder: p.pattern ? "e.g. 500Hn00000abcDEFAA" : undefined,
      defaultValue: p.default === undefined ? "" : String(p.default),
    };
  });
}

function hintFor(p: JsonSchemaProp): string | undefined {
  if (p.pattern) return "15–18 character Salesforce Id";
  if (p.exclusiveMinimum !== undefined) return `must be > ${p.exclusiveMinimum}`;
  return undefined;
}

export function paramsFromValues(
  fields: FieldSpec[],
  values: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = (values[f.name] ?? "").trim();
    if (v === "") continue;
    out[f.name] = f.kind === "number" ? Number(v) : v;
  }
  return out;
}

export function missingRequired(
  fields: FieldSpec[],
  values: Record<string, string>,
): string[] {
  return fields
    .filter((f) => f.required && !(values[f.name] ?? "").trim())
    .map((f) => f.label);
}
