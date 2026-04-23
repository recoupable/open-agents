import "server-only";

import { parseGitHubUrl } from "@/lib/github/client";

export type SessionRepo = {
  owner: string;
  repo: string;
  cloneUrl: string;
  /** `<owner>/<repo>` convenience string for UI + API calls. */
  identifier: string;
};

/**
 * Resolves the session's GitHub repo from its stored `repoOwner`/`repoName`,
 * falling back to parsing `cloneUrl` via `parseGitHubUrl`.
 *
 * OrgSelector-created sessions only populate `cloneUrl`, so the fallback is
 * the one that keeps merge / close-pr / checks / merge-readiness flows
 * working for them. Returns `null` when neither source provides a usable
 * owner+repo.
 */
export function resolveSessionRepo(session: {
  cloneUrl?: string | null;
  repoOwner?: string | null;
  repoName?: string | null;
}): SessionRepo | null {
  const cloneUrl = session.cloneUrl?.trim();
  if (!cloneUrl) {
    return null;
  }

  const owner = session.repoOwner?.trim();
  const repo = session.repoName?.trim();

  if (owner && repo) {
    return { owner, repo, cloneUrl, identifier: `${owner}/${repo}` };
  }

  const parsed = parseGitHubUrl(cloneUrl);
  if (!parsed) {
    return null;
  }

  return {
    owner: parsed.owner,
    repo: parsed.repo,
    cloneUrl,
    identifier: `${parsed.owner}/${parsed.repo}`,
  };
}
