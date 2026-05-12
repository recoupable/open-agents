import { RECOUPABLE_API_BASE_URL } from "@/lib/recoupable/api-base-url";

type CreateCreditsSessionResult = { error: unknown } | undefined;

/**
 * Creates a Stripe Checkout Session for a one-time credit top-up and opens
 * the hosted payment page in a new tab. Mirrors `createClientCheckoutSession`
 * for subscriptions.
 */
export async function createClientCreditsSession(
  accessToken: string,
  credits: number,
): Promise<CreateCreditsSessionResult> {
  try {
    const response = await fetch(
      `${RECOUPABLE_API_BASE_URL}/api/credits/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          successUrl: window.location.href,
          credits,
        }),
      },
    );

    if (!response.ok) {
      return { error: new Error(`HTTP ${response.status}`) };
    }

    const data: { url?: string } = await response.json();
    if (!data.url) {
      return { error: new Error("Checkout URL missing") };
    }

    window.open(data.url, "_blank", "noopener,noreferrer");
  } catch (error) {
    return { error };
  }
}
