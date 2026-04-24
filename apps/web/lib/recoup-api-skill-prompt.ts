/**
 * Always-on nudge appended to the agent's system instructions. Points
 * at the `recoup-api` skill so prompts about anything owned by the
 * user's Recoupable account reliably load the playbook instead of the
 * agent guessing endpoint paths — or, worse, interpreting overloaded
 * nouns like "tasks" as generic repo TODOs.
 */
export const recoupApiSkillPrompt =
  'If the user asks about anything belonging to their Recoup account — artists, socials, orgs, research, tasks, chats, pulses, notifications, subscriptions, or any other resource visible at recoup-api.vercel.app / developers.recoupable.com — load the `recoup-api` skill before composing requests. Treat ambiguous account-data questions (e.g. "what tasks do I have", "my artists", "my notifications") as Recoup questions by default, not as repo-level TODOs. The skill has the base URL, the `RECOUP_ACCESS_TOKEN` Bearer auth pattern, and the docs index to consult.';
