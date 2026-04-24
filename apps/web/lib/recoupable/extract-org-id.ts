import { extractOrgRepoName } from "./extract-org-repo-name";

const UUID_TAIL_PATTERN =
  /-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Extracts the organization UUID from a Recoupable org clone URL or
 * repo name. Recoupable orgs follow the convention
 * `org-<slug>-<uuid-v4>` in their GitHub repo names, so the UUID is
 * always the trailing 36 characters.
 *
 * Accepts either the full clone URL
 * (`https://github.com/recoupable/org-rostrum-pacific-<uuid>`) or the
 * already-extracted repo name (`org-rostrum-pacific-<uuid>`). Returns
 * `null` for anything that doesn't match the org pattern.
 */
export function extractOrgId(cloneUrlOrRepoName: string): string | null {
  const repoName = cloneUrlOrRepoName.startsWith("http")
    ? extractOrgRepoName(cloneUrlOrRepoName)
    : cloneUrlOrRepoName;

  if (!repoName) {
    return null;
  }

  const match = repoName.match(UUID_TAIL_PATTERN);
  return match?.[1]?.toLowerCase() ?? null;
}
