import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session/constants";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

const FORWARD_TIMEOUT_MS = 30_000;

/**
 * Thin proxy that forwards an incoming open-agents API request to
 * the recoupable api on the same path. The user's Privy access
 * token is read from the session cookie and re-emitted as
 * `Authorization: Bearer <token>` so api's `validateAuthContext`
 * can authenticate the call as the same account.
 *
 * The query string and (for non-GET) request body are passed through
 * unchanged. The api response — status, body, content-type — is
 * returned to the original caller verbatim.
 *
 * Used by route handlers that have been cut over to api: the route
 * file becomes a one-liner that returns `forwardToApi(req, "...")`.
 *
 * @param request - The incoming open-agents API request.
 * @param path - The path on api to forward to (e.g. `/api/sandbox`).
 * @returns A Response from api, or 401 if the user has no Privy
 *   token, or 502 if the upstream call fails.
 */
export async function forwardToApi(
  request: Request,
  path: string,
): Promise<Response> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const incomingUrl = new URL(request.url);
  const target = `${RECOUPABLE_API_BASE_URL}${path}${incomingUrl.search}`;

  const init: RequestInit = {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(request.method !== "GET" && request.method !== "HEAD"
        ? {
            "Content-Type":
              request.headers.get("Content-Type") ?? "application/json",
          }
        : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (error) {
    console.error(`[forwardToApi] ${request.method} ${path} failed:`, error);
    return Response.json({ error: "Upstream unavailable" }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
