"use client";

import { usePrivy } from "@privy-io/react-auth";
import useSWR from "swr";
import { fetchAccountId } from "@/lib/recoupable/fetch-account-id";
import { fetchAccountSubscription } from "@/lib/recoupable/fetch-account-subscription";

export function useProStatus() {
  const { authenticated, getAccessToken, user } = usePrivy();

  const { data, error, isLoading, mutate } = useSWR(
    authenticated && user?.id ? ["pro-status", user.id] : null,
    async () => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing Privy access token");
      }
      const accountId = await fetchAccountId(token);
      const { isPro } = await fetchAccountSubscription(token, accountId);
      return isPro;
    },
    { revalidateOnFocus: true },
  );

  return {
    isPro: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
