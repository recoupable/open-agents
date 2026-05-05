import "server-only";

import type { AvailableModel } from "@/lib/models";
import { RECOUPABLE_API_BASE_URL } from "@/lib/recoupable/api-base-url";

/**
 * Fetches the model catalog from the Recoupable API for SSR-time
 * hydration of the chat page. Best-effort — any failure (network,
 * non-2xx, malformed JSON) returns an empty list so a transient
 * api outage doesn't gate the page render. Client-side `useSWR`
 * recovers the live catalog after hydration.
 */
export async function getInitialModels(): Promise<AvailableModel[]> {
  try {
    const res = await fetch(`${RECOUPABLE_API_BASE_URL}/api/ai/models`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: AvailableModel[] };
    return data.models ?? [];
  } catch {
    return [];
  }
}
