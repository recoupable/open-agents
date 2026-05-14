import { z } from "zod";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

const savedCardSchema = z.object({
  brand: z.string(),
  last4: z.string(),
  exp_month: z.number().int(),
  exp_year: z.number().int(),
  funding: z.string(),
});

const accountPaymentMethodResponseSchema = z.object({
  account_id: z.string(),
  card: savedCardSchema.nullable(),
});

export type SavedCard = z.infer<typeof savedCardSchema>;
export type AccountPaymentMethod = z.infer<
  typeof accountPaymentMethodResponseSchema
>;

/**
 * Calls `GET /api/accounts/{id}/payment-method` on the Recoupable API.
 * Returns the default saved card or `card: null` when none is on file.
 */
export async function fetchAccountPaymentMethod(
  accessToken: string,
  accountId: string,
): Promise<AccountPaymentMethod> {
  const res = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/accounts/${accountId}/payment-method`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`accounts/payment-method ${res.status}`);
  }
  const parsed = accountPaymentMethodResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error(
      "accounts/payment-method returned an invalid response shape",
    );
  }
  return parsed.data;
}
