import { isAgentContext } from "./utils";

/**
 * Read the per-prompt Recoupable access token from agent context.
 * Returns undefined when no token is present (e.g. callers that do not
 * authenticate against the Recoupable API).
 */
export function getRecoupAccessToken(
  experimental_context: unknown,
): string | undefined {
  const context = isAgentContext(experimental_context)
    ? experimental_context
    : undefined;
  return context?.recoupAccessToken;
}
