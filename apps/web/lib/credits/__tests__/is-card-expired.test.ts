import { describe, expect, it } from "bun:test";
import { isCardExpired } from "../is-card-expired";

describe("isCardExpired", () => {
  it("is not expired during the exp month", () => {
    // Card exp 12/2026, today is mid-December 2026 → still valid.
    expect(isCardExpired(12, 2026, new Date(2026, 11, 15))).toBe(false);
  });

  it("is not expired on the last day of the exp month", () => {
    // 11pm Dec 31 2026 → still valid (boundary).
    expect(isCardExpired(12, 2026, new Date(2026, 11, 31, 23, 59, 59))).toBe(
      false,
    );
  });

  it("is expired on the first day of the month AFTER expiry", () => {
    // Jan 1 2027 00:00 → expired.
    expect(isCardExpired(12, 2026, new Date(2027, 0, 1))).toBe(true);
  });

  it("is expired when the year is in the past", () => {
    expect(isCardExpired(6, 2020, new Date(2026, 0, 1))).toBe(true);
  });

  it("is not expired when the year is in the future", () => {
    expect(isCardExpired(1, 2030, new Date(2026, 0, 1))).toBe(false);
  });
});
