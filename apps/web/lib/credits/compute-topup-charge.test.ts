import { describe, expect, it } from "bun:test";
import { computeTopupCharge, formatCents } from "./compute-topup-charge";

describe("computeTopupCharge", () => {
  it("grosses up to net credits after the 2.9% + 30¢ Stripe fee", () => {
    // 10000 credits ($100): ceil((10000+30)/0.971) = 10330¢ → fee = 330¢
    const r = computeTopupCharge(10_000);
    expect(r).toEqual({ credits: 10_000, feeCents: 330, totalCents: 10_330 });
  });

  it("totalCents = credits + feeCents for many sizes", () => {
    for (const c of [1, 18, 100, 2000, 5000, 50_000]) {
      const r = computeTopupCharge(c);
      expect(r.totalCents).toBe(r.credits + r.feeCents);
    }
  });

  it("nets >= credits after Stripe's actual fee", () => {
    for (const c of [100, 2000, 50_000]) {
      const { totalCents } = computeTopupCharge(c);
      const stripeFee = totalCents * 0.029 + 30;
      expect(totalCents - stripeFee).toBeGreaterThanOrEqual(c - 0.5);
    }
  });

  it("returns zeros for non-positive or non-integer input", () => {
    expect(computeTopupCharge(0)).toEqual({
      credits: 0,
      feeCents: 0,
      totalCents: 0,
    });
    expect(computeTopupCharge(-5)).toEqual({
      credits: 0,
      feeCents: 0,
      totalCents: 0,
    });
    expect(computeTopupCharge(12.5)).toEqual({
      credits: 0,
      feeCents: 0,
      totalCents: 0,
    });
  });
});

describe("formatCents", () => {
  it("renders USD with two decimals", () => {
    expect(formatCents(10_000)).toBe("$100.00");
    expect(formatCents(2_091)).toBe("$20.91");
    expect(formatCents(0)).toBe("$0.00");
  });
});
