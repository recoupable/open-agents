import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

export type PatchRecoupSessionBody = {
  title?: string;
  status?: "running" | "archived";
};

/**
 * PATCH `recoup-api/api/sessions/{sessionId}` with Privy Bearer auth.
 * Response body matches open-agents session JSON (`{ session }` on success).
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
