import { describe, expect, it } from "bun:test";
import { formatDollarsCompact } from "./format-dollars-compact";

describe("formatDollarsCompact", () => {
  it("drops decimals for whole-dollar amounts", () => {
    expect(formatDollarsCompact(2_000)).toBe("$20");
    expect(formatDollarsCompact(5_000)).toBe("$50");
    expect(formatDollarsCompact(10_000)).toBe("$100");
    expect(formatDollarsCompact(50_000)).toBe("$500");
  });

  it("keeps decimals when there are cents", () => {
    expect(formatDollarsCompact(2_091)).toBe("$20.91");
    expect(formatDollarsCompact(750)).toBe("$7.50");
  });

  it("renders zero as $0", () => {
    expect(formatDollarsCompact(0)).toBe("$0");
  });
});
