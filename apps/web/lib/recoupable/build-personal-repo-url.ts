import { toKebabCase } from "@/lib/string/to-kebab-case";
import { RECOUPABLE_GITHUB_OWNER } from "./github-owner";

/**
 * Builds the GitHub URL for an account's per-account ("personal") repository,
 * used as the fallback when the user belongs to zero Recoupable organizations.
 * Convention: `https://github.com/recoupable/<kebab(account_name)>-<account_id>`.
 *
 * Example: `recoupable/sweetman-fb678396-a68f-4294-ae50-b8cacf9ce77b`.
 *
 * Mirrors `buildOrgRepoUrl` for orgs (which uses an `org-` prefix); personal
 * repos use no prefix because the account name is already the disambiguator.
 */
export function buildPersonalRepoUrl(params: {
  accountName: string;
  accountId: string;
}): string {
  const slug = toKebabCase(params.accountName);
  return `https://github.com/${RECOUPABLE_GITHUB_OWNER}/${slug}-${params.accountId}`;
}
