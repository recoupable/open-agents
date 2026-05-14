"use client";

import { usePrivy } from "@privy-io/react-auth";
import useSWR from "swr";
import { fetchAccountId } from "@/lib/recoupable/fetch-account-id";
import {
  type AccountPaymentMethod,
  fetchAccountPaymentMethod,
} from "@/lib/recoupable/fetch-account-payment-method";

/**
 * SWR hook that fetches the default Stripe payment method on file for the
 * authenticated account. Powers the pre-charge confirmation in the credits
 * top-up dialog — show the saved card brand + last4 so the customer knows
 * which card will be charged before clicking Continue.
 */
export function useSavedPaymentMethod() {
  const { authenticated, getAccessToken, user } = usePrivy();

  const { data, error, isLoading, mutate } = useSWR<AccountPaymentMethod>(
    authenticated && user?.id ? ["account-payment-method", user.id] : null,
    async () => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing Privy access token");
      }
      const accountId = await fetchAccountId(token);
      return fetchAccountPaymentMethod(token, accountId);
    },
    { revalidateOnFocus: true },
  );

  return {
    paymentMethod: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
