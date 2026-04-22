"use client";

import { usePrivy } from "@privy-io/react-auth";
import useSWR from "swr";

export type Org = {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_image: string | null;
};

interface OrgsResponse {
  organizations: Org[];
}

export function useOrgs() {
  const { ready, getAccessToken } = usePrivy();

  const { data, error, isLoading } = useSWR<OrgsResponse>(
    ready ? "/api/orgs" : null,
    async (url: string) => {
      const accessToken = await getAccessToken();
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) {
        throw new Error("Failed to fetch organizations");
      }
      return res.json() as Promise<OrgsResponse>;
    },
    { revalidateOnFocus: false },
  );

  return {
    orgs: data?.organizations ?? [],
    loading: isLoading,
    error,
  };
}
