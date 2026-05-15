import { eq, sql } from "drizzle-orm";
import { db } from "./client";
import { creditsUsage } from "./schema";

/**
 * Atomically debits `credits_usage.remaining_credits` by `cents` for the
 * given account. Returns the new balance (may be negative — credit gating
 * happens upstream via the api's `ensureCreditsOrShortCircuit`, not here).
 *
 * Returns `null` if no `credits_usage` row exists for the account (the api
 * is responsible for inserting that row at signup via
 * `initializeAccountCredits`). Callers should swallow this — a missing
 * wallet row means we record the usage event but skip the debit; a
 * reconciliation job can flag it later.
 */
export async function deductCredits(
  accountId: string,
  cents: number,
): Promise<number | null> {
  if (cents <= 0) return null;

  const result = await db
    .update(creditsUsage)
    .set({
      remainingCredits: sql`${creditsUsage.remainingCredits} - ${cents}`,
    })
    .where(eq(creditsUsage.accountId, accountId))
    .returning({ remainingCredits: creditsUsage.remainingCredits });

  if (result.length === 0) return null;
  return result[0].remainingCredits;
}
