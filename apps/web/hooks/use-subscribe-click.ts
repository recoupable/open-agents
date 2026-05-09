"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback } from "react";
import { createClientCheckoutSession } from "@/lib/stripe/create-client-checkout-session";
import { createClientPortalSession } from "@/lib/stripe/create-client-portal-session";
import { useProStatus } from "./use-pro-status";

export function useSubscribeClick() {
  const { authenticated, getAccessToken, login } = usePrivy();
  const { isPro, isLoading } = useProStatus();

  const handleClick = useCallback(async () => {
    if (!authenticated) {
      login();
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) return;

    if (isPro) {
      await createClientPortalSession(accessToken);
      return;
    }

    await createClientCheckoutSession(accessToken);
  }, [authenticated, login, getAccessToken, isPro]);

  return { handleClick, isPro, isLoading };
}
