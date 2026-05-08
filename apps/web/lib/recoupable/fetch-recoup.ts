import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

/**
 * Calls a recoupable api endpoint directly from the browser using a
 * Privy access token as `Authorization: Bearer`. Replaces the older
 * pattern of routing through an open-agents same-origin proxy:
 * the api enables CORS for the open-agents origin, and api's
 * `validateAuthContext` accepts Privy bearers natively (looks up the
 * caller's account_id by email from the token claims).
 *
 * Usage:
 *   const { getAccessToken } = usePrivy();
 *   const token = await getAccessToken();
 *   if (!token) throw new Error("Not authenticated");
 *   const res = await fetchRecoup(token, "/api/sandbox/status?sessionId=...");
 *
 * @param accessToken - Privy access token from `usePrivy().getAccessToken()`.
 * @param path - The api path (e.g. `/api/sandbox`).
 * @param init - Standard fetch init; `Authorization` is forced.
 * @returns The raw upstream Response — caller handles `res.ok` and parsing.
 */
export function fetchRecoup(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${RECOUPABLE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
