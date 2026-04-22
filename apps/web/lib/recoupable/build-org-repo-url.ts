import { toKebabCase } from "@/lib/string/to-kebab-case";

/**
 * Builds the GitHub URL for an org's per-org repository.
 * Convention: `https://github.com/recoupable/org-<kebab(name)>-<organization_id>`.
 */
export function buildOrgRepoUrl(params: {
  organizationName: string;
  organizationId: string;
}): string {
  const slug = toKebabCase(params.organizationName);
  return `https://github.com/recoupable/org-${slug}-${params.organizationId}`;
}
