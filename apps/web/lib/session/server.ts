import "server-only";
import type { NextRequest } from "next/server";
import { fetchPrivyUserProfile } from "@/lib/privy/fetch-user-profile";
import { verifyPrivyAccessToken } from "@/lib/privy/verify-access-token";
import { fetchOrCreateAccount } from "@/lib/recoupable/fetch-or-create-account";
import { resolveAccountIdFromPrivyToken } from "@/lib/recoupable/resolve-account-id";
import { SESSION_COOKIE_NAME } from "./constants";
import type { Session } from "./types";

/**
 * Resolves a Privy access token to a session shaped against the
 * recoupable identity model. Open-agents no longer maintains its
 * own users table — `session.user.id` is now the recoupable
 * `account_id` (UUID), resolved via api's `GET /api/accounts/id`.
 * Profile fields (email, name, avatar) come from Privy directly.
 *
 * For brand-new Privy users, `GET /api/accounts/id` 401s with
 * "No account found for this email". We fall back to the idempotent
 * `POST /api/accounts` to provision a row so first sign-in resolves
 * to a session and the landing redirect can fire.
 */
export async function getSessionFromCookie(
  cookieValue?: string,
): Promise<Session | undefined> {
  if (!cookieValue) return undefined;

  const verified = await verifyPrivyAccessToken(cookieValue);
  if (!verified) return undefined;

  const profile = await fetchPrivyUserProfile(verified.userId);

  let accountId = await resolveAccountIdFromPrivyToken(cookieValue);
  if (!accountId && profile?.email) {
    const provisioned = await fetchOrCreateAccount(profile.email);
    accountId = provisioned?.accountId ?? null;
  }
  if (!accountId) return undefined;

  return {
    created: verified.expiration * 1000,
    authProvider: "privy",
    user: {
      id: accountId,
      username: profile?.email ?? verified.userId,
      email: profile?.email ?? undefined,
      avatar: profile?.avatarUrl ?? "",
      name: profile?.name ?? undefined,
    },
  };
}

export async function getSessionFromReq(
  req: NextRequest,
): Promise<Session | undefined> {
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return getSessionFromCookie(cookieValue);
}
