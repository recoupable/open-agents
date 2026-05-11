import { z } from "zod";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

const accountCreditsResponseSchema = z.object({
  account_id: z.string(),
  remaining_credits: z.number(),
  total_credits: z.number(),
  used_credits: z.number(),
  is_pro: z.boolean(),
  timestamp: z.string().nullable(),
});

export type AccountCredits = z.infer<typeof accountCreditsResponseSchema>;

export async function fetchAccountCredits(
  accessToken: string,
  accountId: string,
): Promise<AccountCredits> {
  const res = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/accounts/${accountId}/credits`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`accounts/credits ${res.status}`);
  }
  const parsed = accountCreditsResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("accounts/credits returned an invalid response shape");
  }
  return parsed.data;
}
