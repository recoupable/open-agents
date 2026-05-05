import "server-only";

import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

/**
 * Resolves a Privy access token to the caller's recoupable account
 * id (UUID) via `GET /api/accounts/id` on the Recoupable API. Used
 * by the session layer to bridge Privy auth → recoupable account
 * identity now that open-agents no longer maintains its own users
 * table.
 *
 * @param accessToken - The Privy access token to authenticate with.
 * @returns The recoupable `account_id` (UUID), or `null` on any failure.
 */
export async function resolveAccountIdFromPrivyToken(
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${RECOUPABLE_API_BASE_URL}/api/accounts/id`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      accountId?: string;
      account_id?: string;
    };
    return data.accountId ?? data.account_id ?? null;
  } catch {
    return null;
  }
}
