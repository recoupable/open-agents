import type { connectSandbox } from "@open-harness/sandbox";
import type { SessionRecord } from "@/app/api/sessions/_lib/session-context";
import { DEFAULT_GLOBAL_SKILL_REFS } from "@/lib/skills/default-global-skills";
import { installGlobalSkills } from "@/lib/skills/global-skill-installer";

export async function installSessionGlobalSkills(params: {
  sessionRecord: SessionRecord;
  sandbox: Awaited<ReturnType<typeof connectSandbox>>;
}): Promise<void> {
  const userRefs = params.sessionRecord.globalSkillRefs ?? [];
  // Platform-level defaults ship first so they win on dedup if a user
  // happens to list the same skill in their own preferences.
  const globalSkillRefs = [...DEFAULT_GLOBAL_SKILL_REFS, ...userRefs];

  if (globalSkillRefs.length === 0) {
    return;
  }

  await installGlobalSkills({
    sandbox: params.sandbox,
    globalSkillRefs,
  });
}
