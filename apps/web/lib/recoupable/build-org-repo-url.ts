import { toKebabCase } from "@/lib/string/to-kebab-case";
import { RECOUPABLE_GITHUB_OWNER } from "./github-owner";

/**
 * Builds the GitHub URL for an org's per-org repository.
 * Convention: `https://github.com/recoupable/org-<kebab(name)>-<organization_id>`.
 */
export function buildOrgRepoUrl(params: {
  organizationName: string;
  organizationId: string;
}): string {
  const slug = toKebabCase(params.organizationName);
  return `https://github.com/${RECOUPABLE_GITHUB_OWNER}/org-${slug}-${params.organizationId}`;
}
