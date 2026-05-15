import { RECOUPABLE_API_BASE_URL } from "@/lib/recoupable/api-base-url";
import {
  type CreditsTopupResponse,
  parseCreditsTopupResponse,
} from "./parse-credits-topup-response";

export type CreateCreditsSessionResult =
  | { ok: true; response: CreditsTopupResponse }
  | { ok: false; error: unknown };

/**
 * Calls POST /api/credits/sessions and returns a discriminated response —
 * either an auto-charge confirmation (`kind: "charged"`) or a Checkout
 * fallback (`kind: "checkout"`). Callers handle each path (redirect to
 * Checkout vs. show success state + refresh balance).
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
      return { ok: false, error: new Error(`HTTP ${response.status}`) };
    }

    const parsed = parseCreditsTopupResponse(await response.json());
    if (!parsed) {
      return {
        ok: false,
        error: new Error("Unexpected response shape from credits API"),
      };
    }

    return { ok: true, response: parsed };
  } catch (error) {
    return { ok: false, error };
  }
}
