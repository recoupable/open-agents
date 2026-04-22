"use client";

import { usePrivy } from "@privy-io/react-auth";
import useSWR from "swr";
import {
  fetchAccountOrgs,
  type RecoupableOrg,
} from "@/lib/recoupable/fetch-account-orgs";

export type Org = RecoupableOrg;

export function useOrgs() {
  const { ready, getAccessToken } = usePrivy();

  const { data, error, isLoading } = useSWR<Org[]>(
    ready ? "recoupable:orgs" : null,
    async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return [];
      return fetchAccountOrgs(accessToken);
    },
    { revalidateOnFocus: false },
  );

  return {
    orgs: data ?? [],
    loading: isLoading,
    error,
  };
}
