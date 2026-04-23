import { assistantFileLinkPrompt } from "@/lib/assistant-file-links";
import { recoupApiSkillPrompt } from "@/lib/recoup-api-skill-prompt";

/**
 * Platform-wide agent instructions appended on every chat prompt.
 * Compose individual prompt constants here so the chat route and its
 * tests share one source of truth instead of re-joining in each place.
 */
export const agentCustomInstructions = [
  assistantFileLinkPrompt,
  recoupApiSkillPrompt,
].join("\n\n");
