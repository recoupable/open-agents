import { nanoid } from "nanoid";
import {
  countSessionsByUserId,
  createSessionWithInitialChat,
  getArchivedSessionCountByUserId,
  getSessionsWithUnreadByUserId,
  getUsedSessionTitles,
} from "@/lib/db/sessions";
import { getUserPreferences } from "@/lib/db/user-preferences";
import { sanitizeUserPreferencesForSession } from "@/lib/model-access";
import {
  isValidGitHubRepoName,
  isValidGitHubRepoOwner,
} from "@/lib/github/repo-identifiers";
import { getRandomCityName } from "@/lib/random-city";
import { getServerSession } from "@/lib/session/get-server-session";
import {
  isManagedTemplateTrialUser,
  MANAGED_TEMPLATE_TRIAL_SESSION_LIMIT,
  MANAGED_TEMPLATE_TRIAL_SESSION_LIMIT_ERROR,
} from "@/lib/managed-template-trial";

interface CreateSessionRequest {
  title?: string;
  repoOwner?: string;
  repoName?: string;
  branch?: string;
  cloneUrl?: string;
  isNewBranch?: boolean;
  sandboxType?: "vercel";
  autoCommitPush?: boolean;
  autoCreatePr?: boolean;
  orgSlug?: string;
}

function generateBranchName(username: string, name?: string | null): string {
  let initials = "nb";
  if (name) {
    initials =
      name
        .split(" ")
        .map((n) => n[0]?.toLowerCase() ?? "")
        .join("")
        .slice(0, 2) || "nb";
  } else if (username) {
    initials = username.slice(0, 2).toLowerCase();
  }
  const randomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${initials}/${randomSuffix}`;
}

async function resolveSessionTitle(
  input: CreateSessionRequest,
  userId: string,
): Promise<string> {
  if (input.title && input.title.trim()) {
    return input.title.trim();
  }
  const usedNames = await getUsedSessionTitles(userId);
  return getRandomCityName(usedNames);
}

const DEFAULT_ARCHIVED_SESSIONS_LIMIT = 50;
const MAX_ARCHIVED_SESSIONS_LIMIT = 100;

type SessionsStatusFilter = "all" | "active" | "archived";

function parseNonNegativeInteger(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  if (!/^[0-9]+$/.test(value)) {
    return null;
  }

  return Number(value);
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get("status");
  if (
    rawStatus !== null &&
    rawStatus !== "all" &&
    rawStatus !== "active" &&
    rawStatus !== "archived"
  ) {
    return Response.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const statusParam: SessionsStatusFilter = rawStatus ?? "all";

  if (statusParam === "archived") {
    const rawLimit = parseNonNegativeInteger(searchParams.get("limit"));
    const rawOffset = parseNonNegativeInteger(searchParams.get("offset"));

    if (searchParams.get("limit") !== null && rawLimit === null) {
      return Response.json(
        { error: "Invalid archived limit" },
        { status: 400 },
      );
    }

    if (searchParams.get("offset") !== null && rawOffset === null) {
      return Response.json(
        { error: "Invalid archived offset" },
        { status: 400 },
      );
    }

    const limit = Math.min(
      Math.max(rawLimit ?? DEFAULT_ARCHIVED_SESSIONS_LIMIT, 1),
      MAX_ARCHIVED_SESSIONS_LIMIT,
    );
    const offset = rawOffset ?? 0;

    const [sessions, archivedCount] = await Promise.all([
      getSessionsWithUnreadByUserId(session.user.id, {
        status: "archived",
        limit,
        offset,
      }),
      getArchivedSessionCountByUserId(session.user.id),
    ]);

    return Response.json({
      sessions,
      archivedCount,
      pagination: {
        limit,
        offset,
        hasMore: offset + sessions.length < archivedCount,
        nextOffset: offset + sessions.length,
      },
    });
  }

  if (statusParam === "active") {
    const [sessions, archivedCount] = await Promise.all([
      getSessionsWithUnreadByUserId(session.user.id, {
        status: "active",
      }),
      getArchivedSessionCountByUserId(session.user.id),
    ]);

    return Response.json({ sessions, archivedCount });
  }

  const sessions = await getSessionsWithUnreadByUserId(session.user.id);
  return Response.json({ sessions });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
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

  let body: CreateSessionRequest;
  try {
    body = (await req.json()) as CreateSessionRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.sandboxType && body.sandboxType !== "vercel") {
    return Response.json({ error: "Invalid sandbox type" }, { status: 400 });
  }

  if (
    body.autoCommitPush !== undefined &&
    typeof body.autoCommitPush !== "boolean"
  ) {
    return Response.json(
      { error: "Invalid autoCommitPush value" },
      { status: 400 },
    );
  }

  if (
    body.autoCreatePr !== undefined &&
    typeof body.autoCreatePr !== "boolean"
  ) {
    return Response.json(
      { error: "Invalid autoCreatePr value" },
      { status: 400 },
    );
  }

  if (
    body.repoOwner !== undefined &&
    (typeof body.repoOwner !== "string" ||
      !isValidGitHubRepoOwner(body.repoOwner))
  ) {
    return Response.json(
      { error: "Invalid repository owner" },
      { status: 400 },
    );
  }

  if (
    body.repoName !== undefined &&
    (typeof body.repoName !== "string" || !isValidGitHubRepoName(body.repoName))
  ) {
    return Response.json({ error: "Invalid repository name" }, { status: 400 });
  }

  const {
    repoOwner,
    repoName,
    branch,
    cloneUrl,
    isNewBranch,
    sandboxType = "vercel",
    autoCommitPush,
    autoCreatePr,
    orgSlug,
  } = body;

  let finalBranch = branch;
  if (isNewBranch) {
    finalBranch = generateBranchName(session.user.username, session.user.name);
  }

  try {
    const [title, rawPreferences] = await Promise.all([
      resolveSessionTitle(body, session.user.id),
      getUserPreferences(session.user.id),
    ]);
    const preferences = sanitizeUserPreferencesForSession(
      rawPreferences,
      session,
      req.url,
    );
    const effectiveAutoCommitPush =
      autoCommitPush ?? preferences.autoCommitPush;
    const effectiveAutoCreatePr = autoCreatePr ?? preferences.autoCreatePr;
    const result = await createSessionWithInitialChat({
      session: {
        id: nanoid(),
        userId: session.user.id,
        title,
        status: "running",
        repoOwner,
        repoName,
        branch: finalBranch,
        cloneUrl,
        orgSlug: orgSlug ?? null,
        isNewBranch: isNewBranch ?? false,
        autoCommitPushOverride: effectiveAutoCommitPush,
        autoCreatePrOverride: effectiveAutoCommitPush
          ? effectiveAutoCreatePr
          : false,
        globalSkillRefs: preferences.globalSkillRefs,
        sandboxState: { type: sandboxType },
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
    console.error("Failed to create session:", error);
    return Response.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}
