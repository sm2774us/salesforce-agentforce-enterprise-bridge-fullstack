import { cn, mmss, num, timeAgo, titleCase, usd } from "../utils";

describe("utils", () => {
  it("formats currency with and without decimals", () => {
    expect(usd(25000)).toBe("$25,000");
    expect(usd(18250.5)).toBe("$18,250.50");
    expect(usd(1_500_000, true)).toBe("$1.5M");
  });
  it("formats numbers", () => expect(num(1234567)).toBe("1,234,567"));
  it("renders relative time buckets", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    const ago = (s: number) => new Date(now - s * 1000).toISOString();
    expect(timeAgo(ago(1), now)).toBe("just now");
    expect(timeAgo(ago(30), now)).toBe("30s ago");
    expect(timeAgo(ago(300), now)).toBe("5m ago");
    expect(timeAgo(ago(7200), now)).toBe("2h ago");
    expect(timeAgo(ago(172800), now)).toBe("2d ago");
  });
  it("formats countdowns and clamps negatives", () => {
    expect(mmss(125)).toBe("02:05");
    expect(mmss(-4)).toBe("00:00");
  });
  it("title-cases snake and kebab names", () => expect(titleCase("create_financial_review")).toBe("Create Financial Review"));
  it("merges tailwind classes, last wins", () => expect(cn("px-2", "px-4", false && "x")).toBe("px-4"));
});
