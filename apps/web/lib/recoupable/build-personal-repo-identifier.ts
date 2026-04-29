import { toKebabCase } from "@/lib/string/to-kebab-case";

const PERSONAL_REPO_OWNER = "recoupable";

/**
 * Returns the `<owner, repo>` pair for an account's personal Recoupable
 * workspace, mirroring `buildPersonalRepoUrl` for callers that talk to
 * the GitHub API directly without re-parsing the URL.
 *
 * Convention: owner = `recoupable`, repo = `<kebab(account_name)>-<account_id>`.
 */
export function buildPersonalRepoIdentifier(params: {
  accountName: string;
  accountId: string;
}): { owner: string; repo: string } {
  const slug = toKebabCase(params.accountName);
  return { owner: PERSONAL_REPO_OWNER, repo: `${slug}-${params.accountId}` };
}
