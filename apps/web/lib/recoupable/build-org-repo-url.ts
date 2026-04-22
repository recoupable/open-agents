function toKebabCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
