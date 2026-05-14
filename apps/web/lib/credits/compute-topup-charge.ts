/**
 * Stripe US-domestic card pricing. Mirrors api/lib/stripe/config.ts so the
 * client-side preview matches what the server will actually charge.
 */
const STRIPE_CARD_FEE_PERCENTAGE = 0.029;
const STRIPE_CARD_FEE_FIXED_CENTS = 30;

export type TopupCharge = {
  /** Credits being purchased (= cents of value granted to the account). */
  credits: number;
  /** Processing fee shown to the customer in cents. */
  feeCents: number;
  /** Total charge in cents (credits + feeCents). */
  totalCents: number;
};

/**
 * Gross up a credits top-up so the customer covers the Stripe processing fee.
 * Mirrors `api/lib/stripe/computeCreditsTopupCharge` exactly so the dialog
 * preview matches the eventual Stripe Checkout line items.
 */
export function computeTopupCharge(credits: number): TopupCharge {
  if (!Number.isInteger(credits) || credits <= 0) {
    return { credits: 0, feeCents: 0, totalCents: 0 };
  }
  const totalCents = Math.ceil(
    (credits + STRIPE_CARD_FEE_FIXED_CENTS) / (1 - STRIPE_CARD_FEE_PERCENTAGE),
  );
  return { credits, feeCents: totalCents - credits, totalCents };
}
