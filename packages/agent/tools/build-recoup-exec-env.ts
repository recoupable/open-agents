import { getRecoupAccessToken } from "./get-recoup-access-token";

/**
 * Build a per-invocation env override carrying the Recoupable access
 * token when one is available, so outbound shell commands (curl, scripts)
 * can authenticate without the token persisting on the sandbox.
 */
export function buildRecoupExecEnv(
  experimental_context: unknown,
): { RECOUP_ACCESS_TOKEN: string } | undefined {
  const token = getRecoupAccessToken(experimental_context);
  if (!token) {
    return undefined;
  }

  return { RECOUP_ACCESS_TOKEN: token };
}
