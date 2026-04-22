import "server-only";

/**
 * Returns the service `GITHUB_TOKEN` env var (trimmed), or `null` when unset
 * or blank.
 *
 * All GitHub operations on recoupable-owned repos (cloning, pushing, API
 * calls) go through this single token; there is no per-user OAuth fallback.
 * Single call site for the env-var name so renames and lookups stay in sync.
 */
export function getServiceGitHubToken(): string | null {
  return process.env.GITHUB_TOKEN?.trim() || null;
}
