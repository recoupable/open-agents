import "server-only";
import { nanoid } from "nanoid";
import {
  createSessionWithInitialChat,
  getUsedSessionTitles,
} from "@/lib/db/sessions";
import { getUserPreferences } from "@/lib/db/user-preferences";
import { sanitizeUserPreferencesForSession } from "@/lib/model-access";
import { getRandomCityName } from "@/lib/random-city";
import { validateCreatePersonalSession } from "./validate-create-personal-session";

/**
 * Onboarding fallback for Privy users who belong to zero Recoupable
 * organizations. After `validateCreatePersonalSession` returns a validated
 * context (auth + email + no-orgs guard + account + GitHub repo all
 * confirmed), this handler does the only thing left: persist the session
 * row + initial chat against the prepared `repo.cloneUrl`.
 */
export async function createPersonalSessionHandler(req: Request) {
  const validated = await validateCreatePersonalSession(req);
  if (validated instanceof Response) {
    return validated;
  }

  const { session, repo } = validated;

  try {
    const [title, rawPreferences] = await Promise.all([
      getUsedSessionTitles(session.user.id).then(getRandomCityName),
      getUserPreferences(session.user.id),
    ]);
    const preferences = sanitizeUserPreferencesForSession(
      rawPreferences,
      session,
      req.url,
    );

    const result = await createSessionWithInitialChat({
      session: {
        id: nanoid(),
        userId: session.user.id,
        title,
        status: "running",
        cloneUrl: repo.cloneUrl,
        repoOwner: repo.owner,
        repoName: repo.repoName,
        isNewBranch: false,
        autoCommitPushOverride: preferences.autoCommitPush,
        autoCreatePrOverride: preferences.autoCommitPush
          ? preferences.autoCreatePr
          : false,
        globalSkillRefs: preferences.globalSkillRefs,
        sandboxState: { type: "vercel" },
        lifecycleState: "provisioning",
        lifecycleVersion: 0,
      },
      initialChat: {
        id: nanoid(),
        title: "New chat",
        modelId: preferences.defaultModelId,
      },
    });

    return Response.json(result);
  } catch (error) {
    console.error("[createPersonalSessionHandler] failed:", error);
    return Response.json(
      { error: "Failed to create personal session" },
      { status: 500 },
    );
  }
}
