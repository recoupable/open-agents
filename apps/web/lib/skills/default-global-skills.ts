import type { GlobalSkillRef } from "./global-skill-refs";

/**
 * Skills installed into every user's sandbox at create time, regardless
 * of their preferences. These are platform-level defaults that the
 * agent should always be able to load on demand — they are cheap
 * (descriptor only) until the agent actually invokes `skillTool` on
 * one, so adding an entry here does not blow up the system prompt.
 */
export const DEFAULT_GLOBAL_SKILL_REFS: readonly GlobalSkillRef[] = [
  {
    source: "recoupable/skills",
    skillName: "recoup-api",
  },
];
