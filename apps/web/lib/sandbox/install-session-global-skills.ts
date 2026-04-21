import type { connectSandbox } from "@open-harness/sandbox";
import type { SessionRecord } from "@/app/api/sessions/_lib/session-context";
import { installGlobalSkills } from "@/lib/skills/global-skill-installer";

export async function installSessionGlobalSkills(params: {
  sessionRecord: SessionRecord;
  sandbox: Awaited<ReturnType<typeof connectSandbox>>;
}): Promise<void> {
  const globalSkillRefs = params.sessionRecord.globalSkillRefs ?? [];
  if (globalSkillRefs.length === 0) {
    return;
  }

  await installGlobalSkills({
    sandbox: params.sandbox,
    globalSkillRefs,
  });
}
