import { connectSandbox, type SandboxState } from "@open-harness/sandbox";
import {
  requireOwnedSession,
  type SessionRecord,
} from "@/app/api/sessions/_lib/session-context";
import { getGitHubAccount } from "@/lib/db/accounts";
import { updateSession } from "@/lib/db/sessions";
import { parseGitHubUrl } from "@/lib/github/client";
import {
  DEFAULT_SANDBOX_BASE_SNAPSHOT_ID,
  DEFAULT_SANDBOX_PORTS,
  DEFAULT_SANDBOX_TIMEOUT_MS,
} from "@/lib/sandbox/config";
import { installSessionGlobalSkills } from "@/lib/sandbox/install-session-global-skills";
import {
  buildActiveLifecycleUpdate,
  getNextLifecycleVersion,
} from "@/lib/sandbox/lifecycle";
import { kickSandboxLifecycleWorkflow } from "@/lib/sandbox/lifecycle-kick";
import { getSessionSandboxName } from "@/lib/sandbox/utils";
import { validateCreateSandboxBody } from "@/lib/sandbox/validate-create-sandbox-body";
import { getServerSession } from "@/lib/session/get-server-session";

export async function handleCreateSandboxRequest(
  req: Request,
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateCreateSandboxBody(rawBody);
  if (!validated.ok) {
    return validated.response;
  }

  const {
    repoUrl,
    branch = "main",
    isNewBranch = false,
    sessionId,
  } = validated.data;

  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!parseGitHubUrl(repoUrl)) {
    return Response.json(
      { error: "Invalid GitHub repository URL" },
      { status: 400 },
    );
  }

  const cloneToken = process.env.GITHUB_TOKEN?.trim() || undefined;
  if (!cloneToken) {
    console.warn(
      "[sandbox] GITHUB_TOKEN is not set; clone will fail for private repos",
    );
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

  const startTime = Date.now();

  const source = {
    repo: repoUrl,
    branch: isNewBranch ? undefined : branch,
    newBranch: isNewBranch ? branch : undefined,
  };

  let sandbox: Awaited<ReturnType<typeof connectSandbox>>;
  try {
    sandbox = await connectSandbox({
      state: {
        type: "vercel",
        ...(sandboxName ? { sandboxName } : {}),
        source,
      },
      options: {
        githubToken: cloneToken,
        gitUser,
        timeout: DEFAULT_SANDBOX_TIMEOUT_MS,
        ports: DEFAULT_SANDBOX_PORTS,
        baseSnapshotId: DEFAULT_SANDBOX_BASE_SNAPSHOT_ID,
        persistent: !!sandboxName,
        resume: !!sandboxName,
        createIfMissing: !!sandboxName,
      },
    });
  } catch (error) {
    console.error("connectSandbox failed:", error);
    return Response.json(
      { error: "Failed to provision sandbox" },
      { status: 502 },
    );
  }

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
    currentBranch: branch,
    mode: "vercel",
    timing: { readyMs },
  });
}
