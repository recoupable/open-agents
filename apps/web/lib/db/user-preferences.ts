import "server-only";

import type { GlobalSkillRef } from "@/lib/skills/global-skill-refs";
import type { ModelVariant } from "@/lib/model-variants";

/**
 * Open-agents no longer stores per-user preferences. The previous
 * `user_preferences` table was dropped during the database
 * unification (see strategy doc, 2026-05-05). Every call site that
 * used to read preferences gets a fixed-defaults object instead;
 * the auto-commit flow now always commits directly to the default
 * branch with no PR creation.
 */
export interface UserPreferencesData {
  defaultModelId: string | null;
  defaultSubagentModelId: string | null;
  defaultSandboxType: "vercel";
  defaultDiffMode: "unified" | "split";
  autoCommitPush: boolean;
  autoCreatePr: boolean;
  alertsEnabled: boolean;
  alertSoundEnabled: boolean;
  publicUsageEnabled: boolean;
  globalSkillRefs: GlobalSkillRef[];
  modelVariants: ModelVariant[];
  enabledModelIds: string[];
}

const DEFAULT_PREFERENCES: UserPreferencesData = {
  defaultModelId: "anthropic/claude-haiku-4.5",
  defaultSubagentModelId: null,
  defaultSandboxType: "vercel",
  defaultDiffMode: "unified",
  autoCommitPush: true,
  autoCreatePr: false,
  alertsEnabled: true,
  alertSoundEnabled: true,
  publicUsageEnabled: false,
  globalSkillRefs: [],
  modelVariants: [],
  enabledModelIds: [],
};

/**
 * Returns the static default preferences. Async signature is
 * preserved so that historical callers using `await` keep working
 * unchanged.
 *
 * @param _accountId - Ignored. Defaults are uniform across accounts.
 */
export async function getUserPreferences(
  _accountId: string,
): Promise<UserPreferencesData> {
  return DEFAULT_PREFERENCES;
}
