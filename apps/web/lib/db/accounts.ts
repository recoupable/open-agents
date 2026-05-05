import "server-only";

/**
 * Open-agents no longer maintains its own OAuth-linkage `accounts`
 * table — that lived under Better Auth's identity model and was
 * dropped during the database unification.
 *
 * Until a replacement source for the user's GitHub access token is
 * wired up (e.g. via Privy linked-accounts or recoupable's GitHub
 * App machinery), this stub returns `null`. Auto-commit code paths
 * that require a user-token gracefully skip when no account is
 * found; service-token paths (`getServiceGitHubToken`) remain
 * unaffected.
 */
export interface GitHubAccount {
  externalUserId: string;
  accessToken: string | null;
  scope: string | null;
}

/**
 * @param _userId - Ignored. Always returns `null`.
 */
export async function getGitHubAccount(
  _userId: string,
): Promise<GitHubAccount | null> {
  return null;
}
