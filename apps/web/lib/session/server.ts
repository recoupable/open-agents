import "server-only";
import type { NextRequest } from "next/server";
import { fetchPrivyUserProfile } from "@/lib/privy/fetch-user-profile";
import { verifyPrivyAccessToken } from "@/lib/privy/verify-access-token";
import { resolveAccountIdFromPrivyToken } from "@/lib/recoupable/resolve-account-id";
import { SESSION_COOKIE_NAME } from "./constants";
import type { Session } from "./types";

export type SessionResolution =
  | { status: "missing-cookie" }
  | { status: "invalid-token" }
  | {
      status: "account-resolution-failed";
      privyUserId: string;
    }
  | {
      status: "authenticated";
      session: Session;
    };

/**
 * Resolves a Privy access token to a session shaped against the
 * recoupable identity model. Open-agents no longer maintains its
 * own users table — `session.user.id` is now the recoupable
 * `account_id` (UUID), resolved via api's `GET /api/accounts/id`.
 * Profile fields (email, name, avatar) come from Privy directly.
 */
export async function getSessionFromCookie(
  cookieValue?: string,
): Promise<Session | undefined> {
  const result = await getSessionResolutionFromCookie(cookieValue);
  return result.status === "authenticated" ? result.session : undefined;
}

export async function getSessionResolutionFromCookie(
  cookieValue?: string,
): Promise<SessionResolution> {
  if (!cookieValue) {
    return { status: "missing-cookie" };
  }

  const verified = await verifyPrivyAccessToken(cookieValue);
  if (!verified) {
    return { status: "invalid-token" };
  }

  const accountId = await resolveAccountIdFromPrivyToken(cookieValue);
  if (!accountId) {
    console.warn("[session] signed-in Privy user failed account resolution", {
      privyUserId: verified.userId,
    });
    return {
      status: "account-resolution-failed",
      privyUserId: verified.userId,
    };
  }

  const profile = await fetchPrivyUserProfile(verified.userId);

  return {
    status: "authenticated",
    session: {
      created: verified.expiration * 1000,
      authProvider: "privy",
      user: {
        id: accountId,
        username: profile?.email ?? verified.userId,
        email: profile?.email ?? undefined,
        avatar: profile?.avatarUrl ?? "",
        name: profile?.name ?? undefined,
      },
    },
  };
}

export async function getSessionFromReq(
  req: NextRequest,
): Promise<Session | undefined> {
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return getSessionFromCookie(cookieValue);
}
