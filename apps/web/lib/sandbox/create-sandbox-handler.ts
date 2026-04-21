import { connectSandbox, type SandboxState } from "@open-harness/sandbox";
import {
  requireOwnedSession,
  type SessionRecord,
} from "@/app/api/sessions/_lib/session-context";
import { getGitHubAccount } from "@/lib/db/accounts";
import { updateSession } from "@/lib/db/sessions";
import { parseGitHubUrl } from "@/lib/github/client";
import { getUserGitHubToken } from "@/lib/github/user-token";
import { fetchAccountGithubRepo } from "@/lib/recoupable/fetch-account-github-repo";
import {
  DEFAULT_SANDBOX_BASE_SNAPSHOT_ID,
  DEFAULT_SANDBOX_PORTS,
  DEFAULT_SANDBOX_TIMEOUT_MS,
} from "@/lib/sandbox/config";
import {
  buildActiveLifecycleUpdate,
  getNextLifecycleVersion,
} from "@/lib/sandbox/lifecycle";
import { kickSandboxLifecycleWorkflow } from "@/lib/sandbox/lifecycle-kick";
import { getSessionSandboxName } from "@/lib/sandbox/utils";
import { getServerSession } from "@/lib/session/get-server-session";
import { installGlobalSkills } from "@/lib/skills/global-skill-installer";

interface CreateSandboxRequest {
  repoUrl?: string;
  branch?: string;
  isNewBranch?: boolean;
  sessionId?: string;
  sandboxType?: "vercel";
}

type SandboxSource = {
  repo: string;
  branch?: string;
  newBranch?: string;
};

function extractBearerToken(req: Request): string | undefined {
  return req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
}

async function resolveAccountRepoSource(params: {
  req: Request;
  githubToken: string | null;
}): Promise<SandboxSource | undefined> {
  const accessToken = extractBearerToken(params.req);
  if (!accessToken) return undefined;

  const githubRepo = await fetchAccountGithubRepo(accessToken);
  if (!(githubRepo && parseGitHubUrl(githubRepo) && params.githubToken)) {
    return undefined;
  }

  return { repo: githubRepo };
}

async function installSessionGlobalSkills(params: {
  sessionRecord: SessionRecord;
  sandbox: Awaited<ReturnType<typeof connectSandbox>>;
}): Promise<void> {
  const globalSkillRefs = params.sessionRecord.globalSkillRefs ?? [];
  if (globalSkillRefs.length === 0) {
    return;
  }

  await installGlobalSkills({
    sandbox: params.sandbox,
    globalSkillRefs,
  });
}

export async function handleCreateSandboxRequest(
  req: Request,
): Promise<Response> {
  let body: CreateSandboxRequest;
  try {
    body = (await req.json()) as CreateSandboxRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.sandboxType && body.sandboxType !== "vercel") {
    return Response.json({ error: "Invalid sandbox type" }, { status: 400 });
  }

  const { repoUrl, branch = "main", isNewBranch = false, sessionId } = body;

  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const githubToken = await getUserGitHubToken(session.user.id);

  if (repoUrl) {
    const parsedRepo = parseGitHubUrl(repoUrl);
    if (!parsedRepo) {
      return Response.json(
        { error: "Invalid GitHub repository URL" },
        { status: 400 },
      );
    }

    if (!githubToken) {
      return Response.json(
        { error: "Connect GitHub to access repositories" },
        { status: 403 },
      );
    }
  }

  let sessionRecord: SessionRecord | undefined;
  if (sessionId) {
    const sessionContext = await requireOwnedSession({
      userId: session.user.id,
      sessionId,
    });
    if (!sessionContext.ok) {
      return sessionContext.response;
    }

    sessionRecord = sessionContext.sessionRecord;
  }

  const sandboxName = sessionId ? getSessionSandboxName(sessionId) : undefined;
  const githubAccount = await getGitHubAccount(session.user.id);
  const githubNoreplyEmail =
    githubAccount?.externalUserId && githubAccount.username
      ? `${githubAccount.externalUserId}+${githubAccount.username}@users.noreply.github.com`
      : undefined;

  const gitUser = {
    name: session.user.name ?? githubAccount?.username ?? session.user.username,
    email:
      githubNoreplyEmail ??
      session.user.email ??
      `${session.user.username}@users.noreply.github.com`,
  };

  // ============================================
  // CREATE OR RESUME: Create a named persistent sandbox for this session.
  // ============================================
  const startTime = Date.now();

  const source: SandboxSource | undefined = repoUrl
    ? {
        repo: repoUrl,
        branch: isNewBranch ? undefined : branch,
        newBranch: isNewBranch ? branch : undefined,
      }
    : await resolveAccountRepoSource({ req, githubToken });

  const sandbox = await connectSandbox({
    state: {
      type: "vercel",
      ...(sandboxName ? { sandboxName } : {}),
      source,
    },
    options: {
      githubToken: githubToken ?? undefined,
      gitUser,
      timeout: DEFAULT_SANDBOX_TIMEOUT_MS,
      ports: DEFAULT_SANDBOX_PORTS,
      baseSnapshotId: DEFAULT_SANDBOX_BASE_SNAPSHOT_ID,
      persistent: !!sandboxName,
      resume: !!sandboxName,
      createIfMissing: !!sandboxName,
    },
  });

  if (sessionId && sandbox.getState) {
    const nextState = sandbox.getState() as SandboxState;
    await updateSession(sessionId, {
      sandboxState: nextState,
      snapshotUrl: null,
      snapshotCreatedAt: null,
      lifecycleVersion: getNextLifecycleVersion(
        sessionRecord?.lifecycleVersion,
      ),
      ...buildActiveLifecycleUpdate(nextState),
    });

    if (sessionRecord) {
      try {
        await installSessionGlobalSkills({
          sessionRecord,
          sandbox,
        });
      } catch (error) {
        console.error(
          `Failed to install global skills for session ${sessionRecord.id}:`,
          error,
        );
      }
    }

    kickSandboxLifecycleWorkflow({
      sessionId,
      reason: "sandbox-created",
    });
  }

  const readyMs = Date.now() - startTime;

  return Response.json({
    createdAt: Date.now(),
    timeout: DEFAULT_SANDBOX_TIMEOUT_MS,
    currentBranch: repoUrl ? branch : undefined,
    mode: "vercel",
    timing: { readyMs },
  });
}
