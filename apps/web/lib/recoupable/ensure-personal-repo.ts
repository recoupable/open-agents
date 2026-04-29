import "server-only";
import { createRepository } from "@/lib/github/client";
import { repositoryExists } from "@/lib/github/repository-exists";
import { getServiceGitHubToken } from "@/lib/github/service-token";
import { buildPersonalRepoIdentifier } from "./build-personal-repo-identifier";
import { buildPersonalRepoUrl } from "./build-personal-repo-url";
import { RECOUPABLE_GITHUB_OWNER } from "./github-owner";

export type EnsurePersonalRepoResult = {
  cloneUrl: string;
  repoUrl: string;
  owner: string;
  repoName: string;
};

/**
 * Idempotently ensures a personal repo exists for the given account.
 *
 * Naming follows `recoupable/<kebab(name)>-<account_id>` (see
 * `buildPersonalRepoUrl`). We check existence with `GET /repos/...` first
 * so a pre-existing repo is a clean no-op; only when the repo is genuinely
 * absent (404) do we attempt creation. Avoids the 422 ambiguity where the
 * GitHub API returns the same status for "name taken" and "name invalid".
 *
 * Returns `null` when the service token is missing, the existence check
 * fails for non-404 reasons, or creation fails — all treated as fatal by
 * callers.
 */
export async function ensurePersonalRepo(params: {
  accountName: string;
  accountId: string;
}): Promise<EnsurePersonalRepoResult | null> {
  const token = getServiceGitHubToken();
  if (!token) {
    console.error(
      "[ensurePersonalRepo] GITHUB_TOKEN missing; cannot create repo",
    );
    return null;
  }

  const { repo: repoName } = buildPersonalRepoIdentifier({
    accountName: params.accountName,
    accountId: params.accountId,
  });

  const existing = await repositoryExists({
    owner: RECOUPABLE_GITHUB_OWNER,
    repo: repoName,
    token,
  });

  if (existing === null) {
    console.error(
      `[ensurePersonalRepo] failed to check ${RECOUPABLE_GITHUB_OWNER}/${repoName}`,
    );
    return null;
  }

  if (existing) {
    return {
      cloneUrl: buildPersonalRepoUrl({
        accountName: params.accountName,
        accountId: params.accountId,
      }),
      repoUrl: `https://github.com/${RECOUPABLE_GITHUB_OWNER}/${repoName}`,
      owner: RECOUPABLE_GITHUB_OWNER,
      repoName,
    };
  }

  const result = await createRepository({
    name: repoName,
    description: `Personal Recoupable workspace for account ${params.accountId}`,
    isPrivate: true,
    token,
    owner: RECOUPABLE_GITHUB_OWNER,
    accountType: "Organization",
  });

  if (!result.success || !result.cloneUrl || !result.repoUrl) {
    console.error(
      `[ensurePersonalRepo] createRepository failed: ${result.error ?? "unknown"}`,
    );
    return null;
  }

  return {
    cloneUrl: result.cloneUrl,
    repoUrl: result.repoUrl,
    owner: result.owner ?? RECOUPABLE_GITHUB_OWNER,
    repoName: result.repoName ?? repoName,
  };
}
