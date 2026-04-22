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
  const handlerStart = Date.now();
  let lastStep = handlerStart;
  const logTiming = (
    phase: string,
    sessionId: string | undefined,
    extra?: Record<string, unknown>,
  ) => {
    const now = Date.now();
    console.log("[sandbox-handler-timing]", {
      sessionId: sessionId ?? "unknown",
      phase,
      step_ms: now - lastStep,
      elapsed_ms: now - handlerStart,
      ...extra,
    });
    lastStep = now;
  };

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

  logTiming("auth_and_db_lookups", sessionId);

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
  logTiming("connect_sandbox", sessionId);

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
    logTiming("update_session_state", sessionId);

    if (sessionRecord) {
      try {
        await installSessionGlobalSkills({
          sessionRecord,
          sandbox,
        });
        logTiming("install_global_skills", sessionId, {
          skillCount: sessionRecord.globalSkillRefs?.length ?? 0,
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

  const readyMs = Date.now() - handlerStart;
  logTiming("handler_total", sessionId, { readyMs });

  return Response.json({
    createdAt: Date.now(),
    timeout: DEFAULT_SANDBOX_TIMEOUT_MS,
    currentBranch: branch,
    mode: "vercel",
    timing: { readyMs },
  });
}
