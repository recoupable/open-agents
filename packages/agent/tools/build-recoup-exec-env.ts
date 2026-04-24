import { getRecoupAccessToken } from "./get-recoup-access-token";
import { getRecoupOrgId } from "./get-recoup-org-id";

/**
 * Build a per-invocation env override carrying Recoupable sandbox
 * context — access token and (when the sandbox was opened against an
 * org repo) the org UUID — so outbound shell commands (curl, scripts)
 * can authenticate and scope requests without any credential or org
 * state persisting on the sandbox.
 *
 * Returns undefined only when nothing is available to inject.
 */
export function buildRecoupExecEnv(
  experimental_context: unknown,
): Record<string, string> | undefined {
  const token = getRecoupAccessToken(experimental_context);
  const orgId = getRecoupOrgId(experimental_context);

  const env: Record<string, string> = {};
  if (token) {
    env.RECOUP_ACCESS_TOKEN = token;
  }
  if (orgId) {
    env.RECOUP_ORG_ID = orgId;
  }

  return Object.keys(env).length > 0 ? env : undefined;
}
