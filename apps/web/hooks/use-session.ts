"use client";

import { usePrivy } from "@privy-io/react-auth";
import useSWR from "swr";
import { fetchAccountId } from "@/lib/recoupable/fetch-account-id";
import type { SessionUserInfo } from "@/lib/session/types";

/**
 * Client-side session hook. Derives auth state from Privy directly and
 * resolves the recoupable `account_id` via `GET /api/accounts/id` (which
 * idempotently provisions on first sign-in). No `/api/auth/info`
 * roundtrip — that route was removed during the db-unification migration.
 *
 * GitHub linkage fields default to `false` here; consumers that need
 * them should query recoup-api directly.
 */
export function useSession() {
  const { ready, authenticated, getAccessToken, user } = usePrivy();

  const { data: accountId, isLoading: accountIdLoading } = useSWR(
    ready && authenticated && user?.id ? ["account-id", user.id] : null,
    async () => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing Privy access token");
      }
      return fetchAccountId(token);
    },
    { revalidateOnFocus: true },
  );

  const loading = !ready || (authenticated && accountIdLoading);
  const email = user?.email?.address;
  const sessionUser: SessionUserInfo["user"] =
    ready && authenticated && accountId
      ? {
          id: accountId,
          username: email ?? user?.id ?? "user",
          email,
          avatar: "",
          name: undefined,
        }
      : undefined;

  const session: SessionUserInfo | null = sessionUser
    ? { user: sessionUser, authProvider: "privy" }
    : null;

  return {
    session,
    loading,
    isAuthenticated: !!sessionUser,
    hasGitHub: false,
    hasGitHubAccount: false,
    hasGitHubInstallations: false,
  };
}
