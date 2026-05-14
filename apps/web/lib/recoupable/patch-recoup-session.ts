import type { Session } from "@/lib/db/schema";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

/** Request body for Recoup `PATCH /api/sessions/{sessionId}` (matches public OpenAPI). */
export type PatchRecoupSessionBody = {
  title?: string;
  status?: Session["status"];
  linesAdded?: number;
  linesRemoved?: number;
};

/**
 * PATCH `recoup-api/api/sessions/{sessionId}` with Privy Bearer auth.
 * Optional fields: rename (`title`), lifecycle `status`, persisted line counters.
 * Response shape: `{ session }` on 200 (same wire format as open-agents `Session`).
 */
export function patchRecoupSession(
  sessionId: string,
  body: PatchRecoupSessionBody,
  accessToken: string,
): Promise<Response> {
  return fetch(
    `${RECOUPABLE_API_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    },
  );
}

type RecoupSessionPatchJson = { session?: Session; error?: string };

/**
 * PATCH session on Recoup API and return `{ session }` or throw with server message.
 * Keeps call sites small (fetch + parse + error shape live here, not in UI files).
 */
export async function patchRecoupSessionJson(
  sessionId: string,
  body: PatchRecoupSessionBody,
  accessToken: string,
): Promise<Session> {
  const res = await patchRecoupSession(sessionId, body, accessToken);
  const data = (await res.json()) as RecoupSessionPatchJson;
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  if (!data.session) {
    throw new Error(data.error ?? "Missing session in response");
  }
  return data.session;
}
