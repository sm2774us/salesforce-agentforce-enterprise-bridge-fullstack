import { render, screen } from "@testing-library/react";
import { countRedactions, highlightRedactions } from "../redaction";

describe("redaction", () => {
  it("counts tokens", () => expect(countRedactions("a [REDACTED:EMAIL] b [REDACTED:CARD]")).toBe(2));
  it("highlights each token and keeps plain text", () => {
    render(<p>{highlightRedactions("call [REDACTED:PHONE] now")}</p>);
    expect(screen.getByTestId("redaction")).toHaveTextContent("[REDACTED:PHONE]");
    expect(screen.getByText(/call/)).toBeInTheDocument();
  });
  it("handles text with no tokens", () => expect(countRedactions("clean")).toBe(0));
});
