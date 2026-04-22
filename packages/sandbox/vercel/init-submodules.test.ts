import { describe, expect, test } from "bun:test";
import { initSubmodules } from "./init-submodules";

type RunCommandCall = {
  cmd: string;
  args: string[];
  cwd: string;
};

function createMockSdk(exitCode: number) {
  const calls: RunCommandCall[] = [];
  return {
    calls,
    sdk: {
      runCommand: async (params: RunCommandCall) => {
        calls.push(params);
        return { exitCode };
      },
    },
  };
}

describe("initSubmodules", () => {
  test("runs `git submodule update --init --recursive` without auth when no token", async () => {
    const { sdk, calls } = createMockSdk(0);

    await initSubmodules({ sdk, workingDirectory: "/vercel/sandbox" });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      cmd: "git",
      args: ["submodule", "update", "--init", "--recursive"],
      cwd: "/vercel/sandbox",
    });
  });

  test("installs a per-invocation insteadOf rewrite when a token is provided", async () => {
    const { sdk, calls } = createMockSdk(0);

    await initSubmodules({
      sdk,
      workingDirectory: "/vercel/sandbox",
      token: "ghs_secrettoken",
    });

    const firstCall = calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.args).toEqual([
      "-c",
      "url.https://x-access-token:ghs_secrettoken@github.com/.insteadOf=https://github.com/",
      "submodule",
      "update",
      "--init",
      "--recursive",
    ]);
  });

  test("throws when git submodule update exits non-zero", async () => {
    const { sdk } = createMockSdk(128);

    await expect(
      initSubmodules({ sdk, workingDirectory: "/vercel/sandbox" }),
    ).rejects.toThrow("Failed to initialize git submodules (exit code 128)");
  });
});
