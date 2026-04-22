import "server-only";

import type { Sandbox } from "@open-harness/sandbox";
import { parseGitHubUrl } from "@/lib/github/client";
import { buildGitHubAuthRemoteUrl } from "@/lib/github/repo-identifiers";
import { getServiceGitHubToken } from "@/lib/github/service-token";

export type EnsureAuthenticatedOriginResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Rewrites the sandbox's `origin` remote to an authenticated URL using the
 * service `GITHUB_TOKEN`. Owner/repo are parsed from the session's `cloneUrl`.
 *
 * Required before `git push` on any recoupable-owned repo. The clone itself
 * is authenticated via the sandbox network policy, but git push needs
 * credentials embedded in the remote URL.
 */
export async function ensureAuthenticatedOrigin(params: {
  sandbox: Sandbox;
  cloneUrl: string | null | undefined;
}): Promise<EnsureAuthenticatedOriginResult> {
  const { sandbox, cloneUrl } = params;

  if (!cloneUrl) {
    return { ok: false, reason: "Session has no cloneUrl" };
  }

  const token = getServiceGitHubToken();
  if (!token) {
    return { ok: false, reason: "GITHUB_TOKEN env var is not set" };
  }

  const parsed = parseGitHubUrl(cloneUrl);
  if (!parsed) {
    return { ok: false, reason: `Unable to parse GitHub URL: ${cloneUrl}` };
  }

  const authUrl = buildGitHubAuthRemoteUrl({
    token,
    owner: parsed.owner,
    repo: parsed.repo,
  });
  if (!authUrl) {
    return {
      ok: false,
      reason: `Rejected owner/repo from cloneUrl: ${parsed.owner}/${parsed.repo}`,
    };
  }

  const result = await sandbox.exec(
    `git remote set-url origin "${authUrl}"`,
    sandbox.workingDirectory,
    5000,
  );

  if (!result.success) {
    const stderr = (result.stderr || result.stdout || "unknown error").slice(
      0,
      200,
    );
    return { ok: false, reason: `git remote set-url failed: ${stderr}` };
  }

  return { ok: true };
}
