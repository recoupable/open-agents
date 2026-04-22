interface SubmoduleSdk {
  runCommand: (params: {
    cmd: string;
    args: string[];
    cwd: string;
  }) => Promise<{ exitCode?: number }>;
}

export interface InitSubmodulesOptions {
  sdk: SubmoduleSdk;
  workingDirectory: string;
  token?: string;
  /**
   * When set, only initialize the submodule for this specific org
   * (at `.openclaw/workspace/orgs/<orgSlug>`) instead of all submodules.
   * This dramatically speeds up sandbox startup.
   */
  orgSlug?: string;
}

/**
 * Initializes git submodules inside the sandbox working directory.
 *
 * When `orgSlug` is provided, only the submodule at
 * `.openclaw/workspace/orgs/<orgSlug>` is initialized — skipping all other
 * org submodules for a much faster startup.
 *
 * When a token is provided, installs a per-invocation `insteadOf` rewrite so
 * any `https://github.com/<owner>/<repo>` URL declared in `.gitmodules` is
 * fetched with the token embedded — without mutating global git config or
 * leaking into other commands.
 *
 * Throws on non-zero exit so the sandbox create path surfaces the failure.
 */
export async function initSubmodules({
  sdk,
  workingDirectory,
  token,
  orgSlug,
}: InitSubmodulesOptions): Promise<void> {
  const args: string[] = [];
  if (token) {
    args.push(
      "-c",
      `url.https://x-access-token:${token}@github.com/.insteadOf=https://github.com/`,
    );
  }
  args.push("submodule", "update", "--init", "--recursive");

  if (orgSlug) {
    // Only initialize the specific org's submodule path
    args.push("--", `.openclaw/workspace/orgs/${orgSlug}`);
  }

  const result = await sdk.runCommand({
    cmd: "git",
    args,
    cwd: workingDirectory,
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to initialize git submodules (exit code ${result.exitCode})`,
    );
  }
}
