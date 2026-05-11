import { z } from "zod";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

const accountIdResponseSchema = z.object({
  status: z.union([z.literal("success"), z.literal("error")]),
  accountId: z.string().optional(),
});

export async function fetchAccountId(accessToken: string): Promise<string> {
  const res = await fetch(`${RECOUPABLE_API_BASE_URL}/api/accounts/id`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`accounts/id ${res.status}`);
  }
  const parsed = accountIdResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("accounts/id returned an invalid response shape");
  }
  if (!parsed.data.accountId) {
    throw new Error("accounts/id missing accountId");
  }
  return parsed.data.accountId;
}
