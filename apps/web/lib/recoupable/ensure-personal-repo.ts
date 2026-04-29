import "server-only";
import { createRepository } from "@/lib/github/client";
import { getServiceGitHubToken } from "@/lib/github/service-token";
import {
  buildPersonalRepoIdentifier,
  buildPersonalRepoUrl,
} from "./build-personal-repo-url";

const PERSONAL_REPO_OWNER = "recoupable";

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
 * `buildPersonalRepoUrl`). On 422 ("Repository name already exists") we
 * treat it as success — the URL is deterministic, so a pre-existing repo
 * is the same repo we'd have created.
 *
 * Returns `null` when the service token is missing or the GitHub call
 * fails for a non-422 reason; callers should treat that as fatal.
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

  const result = await createRepository({
    name: repoName,
    description: `Personal Recoupable workspace for account ${params.accountId}`,
    isPrivate: true,
    token,
    owner: PERSONAL_REPO_OWNER,
    accountType: "Organization",
  });

  // 422 from GitHub means the repo already exists — that's the desired
  // end-state for an idempotent ensure, so synthesize the success record
  // from the deterministic URL.
  if (
    !result.success &&
    result.error === "Repository name already exists or is invalid"
  ) {
    return {
      cloneUrl: buildPersonalRepoUrl({
        accountName: params.accountName,
        accountId: params.accountId,
      }),
      repoUrl: `https://github.com/${PERSONAL_REPO_OWNER}/${repoName}`,
      owner: PERSONAL_REPO_OWNER,
      repoName,
    };
  }

  if (!result.success || !result.cloneUrl || !result.repoUrl) {
    console.error(
      `[ensurePersonalRepo] createRepository failed: ${result.error ?? "unknown"}`,
    );
    return null;
  }

  return {
    cloneUrl: result.cloneUrl,
    repoUrl: result.repoUrl,
    owner: result.owner ?? PERSONAL_REPO_OWNER,
    repoName: result.repoName ?? repoName,
  };
}
