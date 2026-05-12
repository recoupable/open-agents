import { describe, expect, it } from "bun:test";
import { formatCents } from "./format-cents";

describe("formatCents", () => {
  it("renders USD with two decimals", () => {
    expect(formatCents(10_000)).toBe("$100.00");
    expect(formatCents(2_091)).toBe("$20.91");
    expect(formatCents(0)).toBe("$0.00");
  });
});
