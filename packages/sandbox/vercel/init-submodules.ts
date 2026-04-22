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
}

/**
 * Recursively initializes git submodules inside the sandbox working directory.
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
}: InitSubmodulesOptions): Promise<void> {
  const args: string[] = [];
  if (token) {
    args.push(
      "-c",
      `url.https://x-access-token:${token}@github.com/.insteadOf=https://github.com/`,
    );
  }
  args.push("submodule", "update", "--init", "--recursive");

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
