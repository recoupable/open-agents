import { z } from "zod";

const checkoutSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
});

const chargedSchema = z.object({
  paymentIntentId: z.string().min(1),
  creditsPurchased: z.number().int().positive(),
  totalCents: z.number().int().positive(),
});

export type CreditsTopupResponse =
  | { kind: "checkout"; sessionId: string; url: string }
  | {
      kind: "charged";
      paymentIntentId: string;
      creditsPurchased: number;
      totalCents: number;
    };

/**
 * Discriminate the two response shapes of POST /api/credits/sessions:
 *   - Checkout fallback: { id, url }
 *   - Auto-charge:       { paymentIntentId, creditsPurchased, totalCents }
 *
 * Returns null if neither shape matches (server-side bug or unexpected
 * response). Checkout wins on ambiguous payloads so the user always retains
 * the ability to confirm.
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
    };
  }

  const charged = chargedSchema.safeParse(data);
  if (charged.success) {
    return {
      kind: "charged",
      paymentIntentId: charged.data.paymentIntentId,
      creditsPurchased: charged.data.creditsPurchased,
      totalCents: charged.data.totalCents,
    };
  }

  return null;
}
