/**
 * Always-on nudge appended to the agent's system instructions. Points
 * at the `recoup-api` and `artist-workspace` skills so prompts about
 * anything owned by the user's Recoup account reliably load the right
 * playbook — either the filesystem (for sandbox inventory) or the API
 * (for live data) — instead of the agent guessing endpoint paths or
 * interpreting overloaded nouns like "tasks" as generic repo TODOs.
 */
export const recoupApiSkillPrompt =
  'If you\'re asked about anything belonging to their Recoup account — artists, socials, orgs, research, tasks, chats, pulses, notifications, subscriptions, or any other resource visible at recoup-api.vercel.app / developers.recoupable.com — pick the right skill first instead of guessing. For inventory questions about this sandbox ("what artists / orgs do I have", "list my artists", "what\'s in here") load `artist-workspace` — the `orgs/{org-slug}/artists/{artist-slug}/RECOUP.md` tree is authoritative for this sandbox and the API is not. For live data (socials, posts, metrics, research, tasks, notifications) or anything not in the tree, load `recoup-api` — and when `RECOUP_ORG_ID` is set in the env, scope list endpoints to that org (`/api/organizations/$RECOUP_ORG_ID/...`, `--org $RECOUP_ORG_ID` on the CLI) so you get results for the sandbox\'s org, not every org the user belongs to. Treat ambiguous account-data questions as Recoup questions by default, not repo-level TODOs.';
