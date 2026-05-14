import { describe, expect, it } from "bun:test";
import { formatBrand } from "../format-brand";

describe("formatBrand", () => {
  it("capitalizes the first letter of common Stripe brand strings", () => {
    expect(formatBrand("visa")).toBe("Visa");
    expect(formatBrand("mastercard")).toBe("Mastercard");
    expect(formatBrand("amex")).toBe("Amex");
    expect(formatBrand("discover")).toBe("Discover");
  });

  it("passes through already-capitalized input unchanged", () => {
    expect(formatBrand("Visa")).toBe("Visa");
  });

  it("returns an empty string unchanged", () => {
    expect(formatBrand("")).toBe("");
  });
});
