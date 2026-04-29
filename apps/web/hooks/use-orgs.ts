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
    /** Privy SDK + SWR are still establishing the auth/orgs state. */
    loading: !ready || isLoading,
    /** True only once the SWR fetch has actually resolved with data. Prefer
     * this over `!loading` when gating destructive auto-actions; `loading`
     * is briefly false during the pre-`ready` window where `orgs` is the
     * default `[]` rather than a confirmed-empty result. */
    resolved: ready && data !== undefined,
    error,
  };
}
