"use client";

import { usePrivy } from "@privy-io/react-auth";
import useSWR from "swr";
import { RECOUPABLE_API_BASE_URL } from "@/lib/recoupable/api-base-url";

type AccountIdResponse = {
  status: "success" | "error";
  accountId?: string;
};

type SubscriptionResponse = {
  isPro?: boolean;
};

async function fetchProStatus(accessToken: string): Promise<boolean> {
  const idRes = await fetch(`${RECOUPABLE_API_BASE_URL}/api/accounts/id`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!idRes.ok) {
    throw new Error(`accounts/id ${idRes.status}`);
  }
  const idData: AccountIdResponse = await idRes.json();
  if (!idData.accountId) {
    throw new Error("accounts/id missing accountId");
  }

  const subRes = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/accounts/${idData.accountId}/subscription`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!subRes.ok) {
    throw new Error(`subscription ${subRes.status}`);
  }
  const subData: SubscriptionResponse = await subRes.json();
  return subData.isPro ?? false;
}

export function useProStatus() {
  const { authenticated, getAccessToken, user } = usePrivy();

  const { data, isLoading, mutate } = useSWR(
    authenticated && user?.id ? ["pro-status", user.id] : null,
    async () => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing Privy access token");
      }
      return fetchProStatus(token);
    },
    { revalidateOnFocus: true },
  );

  return {
    isPro: data ?? false,
    isLoading,
    refresh: mutate,
  };
}
