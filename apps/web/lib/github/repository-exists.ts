import { getOctokit, getGitHubHttpStatus } from "./client";

/**
 * Returns `true` if `<owner>/<repo>` exists, `false` if 404, `null` on
 * any other failure (auth, rate limit, network). Lets callers
 * distinguish "doesn't exist yet" from "couldn't reach GitHub" before
 * attempting destructive ops like create.
 */
export async function repositoryExists(params: {
  owner: string;
  repo: string;
  token?: string;
}): Promise<boolean | null> {
  const { owner, repo, token } = params;
  try {
    const result = await getOctokit(token);
    if (!result.authenticated) {
      return null;
    }
    await result.octokit.rest.repos.get({ owner, repo });
    return true;
  } catch (error) {
    if (getGitHubHttpStatus(error) === 404) {
      return false;
    }
    console.error("Error checking repository existence:", error);
    return null;
  }
}
