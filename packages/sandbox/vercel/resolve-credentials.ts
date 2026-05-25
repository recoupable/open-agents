/**
 * Resolves explicit Vercel API credentials from environment variables so the
 * `@vercel/sandbox` SDK targets a specific (team, project) pair instead of
 * the deployment's own OIDC-derived scope.
 *
 * When all three env vars are set, returns `{ token, teamId, projectId }`;
 * spread into `Sandbox.create()` / `Sandbox.get()` / `Snapshot.list()` it
 * takes precedence over `VERCEL_OIDC_TOKEN`.
 *
 * Why: sandboxes are scoped to a single Vercel project. Without explicit
 * credentials, each deployment provisions sandboxes in its own project via
 * its auto-injected OIDC, which makes cross-project access (e.g.
 * recoup-api reading a sandbox provisioned by open-agents) impossible.
 * Pointing open-agents at recoup-api's project lets recoup-api find the
 * same sandboxes via its own OIDC.
 *
 * Returns `undefined` (no override) when any of the three are missing so
 * the SDK falls back to its default OIDC-based auth. Partial sets are
 * treated the same as missing — the SDK throws on partial credentials.
 */
export function resolveSandboxCredentials():
  | { token: string; teamId: string; projectId: string }
  | undefined {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (token && teamId && projectId) {
    return { token, teamId, projectId };
  }
  return undefined;
}
