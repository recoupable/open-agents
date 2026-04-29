const BEARER_PREFIX = "Bearer ";

/**
 * Extracts the bearer token from a request's `Authorization` header,
 * or `null` when the header is missing, malformed, or empty.
 * Centralized so route helpers don't each re-implement the slice.
 */
export function readBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return header.slice(BEARER_PREFIX.length).trim() || null;
}
