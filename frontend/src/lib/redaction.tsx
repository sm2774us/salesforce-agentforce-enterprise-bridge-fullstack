import type { ReactNode } from "react";

const RE = /(\[REDACTED:[A-Z]+\])/g;

/** Renders a message, highlighting server-side PII redaction tokens. */
export function highlightRedactions(text: string): ReactNode[] {
  return text.split(RE).map((part, i) =>
    RE.test(part) || /^\[REDACTED:[A-Z]+\]$/.test(part) ? (
      <mark key={i} data-testid="redaction" className="rounded bg-fuchsia-500/20 px-1 font-mono text-[0.85em] text-fuchsia-300">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export const countRedactions = (text: string) => (text.match(/\[REDACTED:[A-Z]+\]/g) ?? []).length;
