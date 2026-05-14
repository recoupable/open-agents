import { z } from "zod";

const declineReasonSchema = z.object({
  code: z.string().min(1),
  declineCode: z.string().min(1).optional(),
  message: z.string().min(1),
});

const checkoutSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  declineReason: declineReasonSchema.optional(),
});

const chargedSchema = z.object({
  paymentIntentId: z.string().min(1),
  creditsPurchased: z.number().int().positive(),
  totalCents: z.number().int().positive(),
});

export type CreditsTopupDeclineReason = z.infer<typeof declineReasonSchema>;

export type CreditsTopupResponse =
  | {
      kind: "checkout";
      sessionId: string;
      url: string;
      declineReason?: CreditsTopupDeclineReason;
    }
  | {
      kind: "charged";
      paymentIntentId: string;
      creditsPurchased: number;
      totalCents: number;
    };

/**
 * Discriminate the two response shapes of POST /api/credits/sessions:
 *   - Checkout fallback: { id, url, declineReason? }
 *   - Auto-charge:       { paymentIntentId, creditsPurchased, totalCents }
 *
 * Returns null if neither shape matches (server-side bug or unexpected
 * response). Checkout wins on ambiguous payloads so the user always retains
 * the ability to confirm. When the Checkout fallback was triggered by a
 * Stripe card error (insufficient funds, expired card, …), declineReason
 * carries the reason so callers can explain *why* before sending the user
 * to update their payment method.
 */
export function parseCreditsTopupResponse(
  data: unknown,
): CreditsTopupResponse | null {
  const checkout = checkoutSchema.safeParse(data);
  if (checkout.success) {
    return {
      kind: "checkout",
      sessionId: checkout.data.id,
      url: checkout.data.url,
      ...(checkout.data.declineReason
        ? { declineReason: checkout.data.declineReason }
        : {}),
    };
  }

  const charged = chargedSchema.safeParse(data);
  if (charged.success) {
    return {
      kind: "charged",
      ...charged.data,
    };
  }

  return null;
}
