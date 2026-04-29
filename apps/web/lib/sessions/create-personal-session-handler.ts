import "server-only";
import { nanoid } from "nanoid";
import {
  countSessionsByUserId,
  createSessionWithInitialChat,
  getUsedSessionTitles,
} from "@/lib/db/sessions";
import { getUserPreferences } from "@/lib/db/user-preferences";
import {
  isManagedTemplateTrialUser,
  MANAGED_TEMPLATE_TRIAL_SESSION_LIMIT,
  MANAGED_TEMPLATE_TRIAL_SESSION_LIMIT_ERROR,
} from "@/lib/managed-template-trial";
import { sanitizeUserPreferencesForSession } from "@/lib/model-access";
import { getRandomCityName } from "@/lib/random-city";
import { ensurePersonalRepo } from "@/lib/recoupable/ensure-personal-repo";
import { fetchOrCreateAccount } from "@/lib/recoupable/fetch-or-create-account";
import { getServerSession } from "@/lib/session/get-server-session";

/**
 * Onboarding fallback for Privy users who belong to zero Recoupable
 * organizations. Idempotently provisions a per-account workspace and
 * returns a freshly created `{ session, chat }` so the caller can route
 * the user straight into a working chat.
 *
 * Steps:
 *   1. `POST recoup-api/api/accounts` — idempotent on email; yields
 *      `{ name, account_id }`.
 *   2. Create `recoupable/<kebab(name)>-<account_id>` via the GitHub
 *      service token (422 "already exists" → no-op).
 *   3. `createSessionWithInitialChat` against the resulting cloneUrl.
 *
 * Safe to call repeatedly: every step is idempotent except for #3, and
 * #3 only runs once #1 and #2 succeed, so failures bail before paying
 * the cost of provisioning a sandbox session.
 */
export async function createPersonalSessionHandler(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = session.user.email;
  if (!email) {
    return Response.json(
      { error: "Authenticated session is missing an email address" },
      { status: 400 },
    );
  }

  if (isManagedTemplateTrialUser(session, req.url)) {
    const existingSessionCount = await countSessionsByUserId(session.user.id);
    if (existingSessionCount >= MANAGED_TEMPLATE_TRIAL_SESSION_LIMIT) {
      return Response.json(
        { error: MANAGED_TEMPLATE_TRIAL_SESSION_LIMIT_ERROR },
        { status: 403 },
      );
    }
  }

  const account = await fetchOrCreateAccount(email);
  if (!account) {
    return Response.json(
      { error: "Failed to provision Recoupable account" },
      { status: 502 },
    );
  }

  const repo = await ensurePersonalRepo({
    accountName: account.name,
    accountId: account.accountId,
  });
  if (!repo) {
    return Response.json(
      { error: "Failed to provision personal repository" },
      { status: 502 },
    );
  }

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
