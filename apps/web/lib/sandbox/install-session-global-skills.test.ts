import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { GlobalSkillRef } from "@/lib/skills/global-skill-refs";

mock.module("server-only", () => ({}));

const installGlobalSkillsCalls: Array<{
  globalSkillRefs: GlobalSkillRef[];
}> = [];

const installGlobalSkillsSpy = mock(
  async (params: { globalSkillRefs: GlobalSkillRef[] }) => {
    installGlobalSkillsCalls.push({ globalSkillRefs: params.globalSkillRefs });
  },
);

mock.module("@/lib/skills/global-skill-installer", () => ({
  installGlobalSkills: installGlobalSkillsSpy,
}));

const { installSessionGlobalSkills } =
  await import("./install-session-global-skills");

const fakeSandbox = {
  workingDirectory: "/workspace",
} as never;

function makeSession(globalSkillRefs: GlobalSkillRef[] | undefined) {
  return {
    id: "session-1",
    userId: "user-1",
    globalSkillRefs,
  } as never;
}

describe("installSessionGlobalSkills", () => {
  beforeEach(() => {
    installGlobalSkillsCalls.length = 0;
    installGlobalSkillsSpy.mockClear();
  });

  test("installs the recoup-api default even when the user has no refs", async () => {
    await installSessionGlobalSkills({
      sessionRecord: makeSession([]),
      sandbox: fakeSandbox,
    });

    expect(installGlobalSkillsCalls).toHaveLength(1);
    expect(installGlobalSkillsCalls[0]?.globalSkillRefs).toEqual([
      { source: "recoupable/skills", skillName: "recoup-api" },
    ]);
  });

  test("installs the recoup-api default when globalSkillRefs is undefined", async () => {
    await installSessionGlobalSkills({
      sessionRecord: makeSession(undefined),
      sandbox: fakeSandbox,
    });

    expect(installGlobalSkillsCalls).toHaveLength(1);
    expect(installGlobalSkillsCalls[0]?.globalSkillRefs).toEqual([
      { source: "recoupable/skills", skillName: "recoup-api" },
    ]);
  });

  test("prepends platform defaults to the user's refs so both get installed", async () => {
    await installSessionGlobalSkills({
      sessionRecord: makeSession([
        { source: "vercel/ai", skillName: "ai-sdk" },
      ]),
      sandbox: fakeSandbox,
    });

    expect(installGlobalSkillsCalls).toHaveLength(1);
    expect(installGlobalSkillsCalls[0]?.globalSkillRefs).toEqual([
      { source: "recoupable/skills", skillName: "recoup-api" },
      { source: "vercel/ai", skillName: "ai-sdk" },
    ]);
  });
});
