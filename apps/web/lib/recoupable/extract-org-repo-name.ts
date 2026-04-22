const ORG_REPO_URL_PATTERN =
  /^https:\/\/github\.com\/recoupable\/([^/]+?)(?:\.git)?\/?$/;

/**
 * Extracts the repo name from a Recoupable org clone URL.
 * Example: `https://github.com/recoupable/org-rostrum-pacific-<uuid>` → `org-rostrum-pacific-<uuid>`.
 * Returns `null` for any URL that does not match the expected pattern.
 */
export function extractOrgRepoName(cloneUrl: string): string | null {
  const match = cloneUrl.match(ORG_REPO_URL_PATTERN);
  return match?.[1] ?? null;
}
