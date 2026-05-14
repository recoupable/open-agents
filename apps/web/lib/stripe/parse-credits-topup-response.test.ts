import { describe, expect, it } from "bun:test";
import { parseCreditsTopupResponse } from "./parse-credits-topup-response";

describe("parseCreditsTopupResponse", () => {
  it("parses the Checkout-fallback shape into kind=checkout", () => {
    const result = parseCreditsTopupResponse({
      id: "cs_live_xyz",
      url: "https://pay.recoupable.com/c/pay/cs_live_xyz",
    });
    expect(result).toEqual({
      kind: "checkout",
      sessionId: "cs_live_xyz",
      url: "https://pay.recoupable.com/c/pay/cs_live_xyz",
    });
  });

  it("parses the auto-charge shape into kind=charged", () => {
    const result = parseCreditsTopupResponse({
      paymentIntentId: "pi_test_abc",
      creditsPurchased: 250,
      totalCents: 289,
    });
    expect(result).toEqual({
      kind: "charged",
      paymentIntentId: "pi_test_abc",
      creditsPurchased: 250,
      totalCents: 289,
    });
  });

  it("returns null when neither shape matches", () => {
    expect(parseCreditsTopupResponse({})).toBeNull();
    expect(parseCreditsTopupResponse({ url: "missing-id" })).toBeNull();
    expect(parseCreditsTopupResponse({ paymentIntentId: "pi_x" })).toBeNull();
    expect(parseCreditsTopupResponse(null)).toBeNull();
  });

  it("prefers the checkout shape when extra fields make the payload look ambiguous", () => {
    // Defensive: if a server response somehow includes both checkout AND charge
    // fields (shouldn't happen per the api), treat as the Checkout fallback so
    // the user still gets the chance to confirm.
    const result = parseCreditsTopupResponse({
      id: "cs_live_xyz",
      url: "https://pay.recoupable.com/c/pay/cs_live_xyz",
      paymentIntentId: "pi_test_abc",
      creditsPurchased: 250,
      totalCents: 289,
    });
    expect(result?.kind).toBe("checkout");
  });

  it("preserves declineReason on the checkout fallback when the api includes it", () => {
    const result = parseCreditsTopupResponse({
      id: "cs_live_xyz",
      url: "https://pay.recoupable.com/c/pay/cs_live_xyz",
      declineReason: {
        code: "card_declined",
        declineCode: "insufficient_funds",
        message: "Your card has insufficient funds.",
      },
    });
    expect(result).toEqual({
      kind: "checkout",
      sessionId: "cs_live_xyz",
      url: "https://pay.recoupable.com/c/pay/cs_live_xyz",
      declineReason: {
        code: "card_declined",
        declineCode: "insufficient_funds",
        message: "Your card has insufficient funds.",
      },
    });
  });

  it("accepts declineReason without declineCode (e.g. expired_card)", () => {
    const result = parseCreditsTopupResponse({
      id: "cs_live_xyz",
      url: "https://pay.recoupable.com/c/pay/cs_live_xyz",
      declineReason: {
        code: "expired_card",
        message: "Your card has expired.",
      },
    });
    expect(result).toEqual({
      kind: "checkout",
      sessionId: "cs_live_xyz",
      url: "https://pay.recoupable.com/c/pay/cs_live_xyz",
      declineReason: {
        code: "expired_card",
        message: "Your card has expired.",
      },
    });
  });

  it("omits declineReason from the parsed response when the payload doesn't include one", () => {
    const result = parseCreditsTopupResponse({
      id: "cs_live_xyz",
      url: "https://pay.recoupable.com/c/pay/cs_live_xyz",
    });
    expect(result).not.toHaveProperty("declineReason");
  });
});
