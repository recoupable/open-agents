/**
 * Always-on nudge appended to the agent's system instructions. Points
 * at the `recoup-api` skill so prompts about Recoupable platform data
 * (artists, socials, orgs, reports) reliably load the playbook instead
 * of the agent guessing endpoint paths from memory.
 */
export const recoupApiSkillPrompt =
  "When the user asks for Recoupable platform data (artists, socials, orgs, research, or anything at recoup-api.vercel.app / developers.recoupable.com), load the `recoup-api` skill before composing requests — it has the base URL, the `RECOUP_ACCESS_TOKEN` Bearer auth pattern, and the docs index to consult.";
