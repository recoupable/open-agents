"use client";

import { usePrivy } from "@privy-io/react-auth";
import useSWR from "swr";
import { fetchAccountId } from "@/lib/recoupable/fetch-account-id";
import {
  type AccountCredits,
  fetchAccountCredits,
} from "@/lib/recoupable/fetch-account-credits";

export function useAccountCredits() {
  const { authenticated, getAccessToken, user } = usePrivy();

  const { data, error, isLoading, mutate } = useSWR<AccountCredits>(
    authenticated && user?.id ? ["account-credits", user.id] : null,
    async () => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing Privy access token");
      }
      const accountId = await fetchAccountId(token);
      return fetchAccountCredits(token, accountId);
    },
    { revalidateOnFocus: true },
  );

  return {
    credits: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
