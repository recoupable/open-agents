import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

type SubscriptionResponse = {
  isPro?: boolean;
};

export async function fetchAccountSubscription(
  accessToken: string,
  accountId: string,
): Promise<{ isPro: boolean }> {
  const res = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/accounts/${accountId}/subscription`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`subscription ${res.status}`);
  }
  const data: SubscriptionResponse = await res.json();
  return { isPro: data.isPro ?? false };
}
