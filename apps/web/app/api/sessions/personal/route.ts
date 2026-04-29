import { nanoid } from "nanoid";
import {
  countSessionsByUserId,
  createSessionWithInitialChat,
  getUsedSessionTitles,
} from "@/lib/db/sessions";
import { getUserPreferences } from "@/lib/db/user-preferences";
import { sanitizeUserPreferencesForSession } from "@/lib/model-access";
import { getRandomCityName } from "@/lib/random-city";
import { getServerSession } from "@/lib/session/get-server-session";
import {
  isManagedTemplateTrialUser,
  MANAGED_TEMPLATE_TRIAL_SESSION_LIMIT,
  MANAGED_TEMPLATE_TRIAL_SESSION_LIMIT_ERROR,
} from "@/lib/managed-template-trial";
import { ensurePersonalRepo } from "@/lib/recoupable/ensure-personal-repo";
import { fetchOrCreateAccount } from "@/lib/recoupable/fetch-or-create-account";

/**
 * `POST /api/sessions/personal`
 *
 * Onboarding fallback for users who belong to zero Recoupable organizations.
 * Idempotently provisions a personal Recoupable account, creates a per-user
 * GitHub repo (`recoupable/<name>-<account_id>`), and starts a fresh blank
 * session against it. Returns the created `{ session, chat }` so the client
 * can navigate straight into the new chat.
 *
 * The endpoint is safe to call repeatedly: the recoup-api accounts route is
 * idempotent on email, the GitHub repo creation tolerates 422 "already
 * exists", and we only spend the cost of provisioning a sandbox session
 * itself if everything else succeeds.
 */
export async function POST(req: Request) {
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

  // 1. Ensure the recoup-api account exists. POST /api/accounts is idempotent
  // on email and gives us the `{ name, account_id }` we need for the repo URL.
  const account = await fetchOrCreateAccount(email);
  if (!account) {
    return Response.json(
      { error: "Failed to provision Recoupable account" },
      { status: 502 },
    );
  }

  // 2. Ensure the personal GitHub repo exists.
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

  // 3. Create the open-agents session bound to the personal repo. Mirrors
  // the OrgSelector path in `POST /api/sessions` but with a fixed cloneUrl
  // and no body inputs — there's nothing for the user to configure here.
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
    console.error("[POST /api/sessions/personal] failed:", error);
    return Response.json(
      { error: "Failed to create personal session" },
      { status: 500 },
    );
  }
}
