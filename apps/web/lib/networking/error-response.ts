/**
 * Standard JSON error response shape used across open-agents API routes
 * and route helpers. Centralizing the body so error fields stay
 * consistent for clients (`{ error: string }`) regardless of which
 * route emitted the failure.
 */
export function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}
