import { z } from "zod";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

const subscriptionResponseSchema = z.object({
  isPro: z.boolean().optional(),
});

export async function fetchAccountSubscription(
  accessToken: string,
  accountId: string,
): Promise<{ isPro: boolean }> {
  const res = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/accounts/${accountId}/subscription`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`subscription ${res.status}`);
  }
  const parsed = subscriptionResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("subscription returned an invalid response shape");
  }
  return { isPro: parsed.data.isPro ?? false };
}
