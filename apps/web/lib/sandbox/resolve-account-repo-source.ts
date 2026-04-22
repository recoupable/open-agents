import { parseGitHubUrl } from "@/lib/github/client";
import { fetchAccountGithubRepo } from "@/lib/recoupable/fetch-account-github-repo";
import { extractBearerToken } from "./extract-bearer-token";

export type SandboxSource = {
  repo: string;
  branch?: string;
  newBranch?: string;
  orgSlug?: string;
};

export type ResolvedSource = {
  source: SandboxSource;
  /** Clone-time token override (service token for Recoupable-managed repos). */
  cloneToken?: string;
};

export async function resolveAccountRepoSource(
  req: Request,
): Promise<ResolvedSource | undefined> {
  const accessToken = extractBearerToken(req);
  if (!accessToken) {
    return undefined;
  }

  const githubRepo = await fetchAccountGithubRepo(accessToken);
  if (!githubRepo) {
    return undefined;
  }
  if (!parseGitHubUrl(githubRepo)) {
    console.warn(
      "[sandbox] account-repo fallback skipped: github_repo did not parse as a GitHub URL",
    );
    return undefined;
  }

  const rawToken = process.env.GITHUB_TOKEN?.trim();
  const cloneToken = rawToken && rawToken.length > 0 ? rawToken : undefined;
  if (!cloneToken) {
    console.warn(
      "[sandbox] account-repo fallback: GITHUB_TOKEN is not set; clone will fail for private repos",
    );
  }

  return { source: { repo: githubRepo }, cloneToken };
}
