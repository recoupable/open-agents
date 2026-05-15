import "server-only";

import { connectSandbox } from "@open-harness/sandbox";
import { getSessionById, updateSession } from "@/lib/db/sessions";
import { canOperateOnSandbox, clearSandboxState } from "./utils";

type SessionRecord = NonNullable<Awaited<ReturnType<typeof getSessionById>>>;
type SessionUpdateInput = Parameters<typeof updateSession>[1];

interface ArchiveSessionOptions {
  currentSession?: SessionRecord;
  update?: SessionUpdateInput;
  logPrefix?: string;
  scheduleBackgroundWork?: (callback: () => Promise<void>) => void;
}

interface ArchiveSessionResult {
  session: Awaited<ReturnType<typeof updateSession>> | null;
  archiveTriggered: boolean;
}

async function refreshArchiveGitState(
  currentSession: SessionRecord,
  logPrefix: string,
): Promise<SessionUpdateInput> {
  if (!canOperateOnSandbox(currentSession.sandboxState)) {
    return {};
  }

  try {
    const sandbox = await connectSandbox(currentSession.sandboxState);
    const cwd = sandbox.workingDirectory;
    const branchResult = await sandbox.exec(
      "git symbolic-ref --short HEAD",
      cwd,
      10000,
    );

    const branch = branchResult.success ? branchResult.stdout.trim() : "";
    if (!branch || branch === currentSession.branch) {
      return {};
    }

    return { branch };
  } catch (error) {
    console.warn(
      `${logPrefix} Failed to refresh git state before archiving session ${currentSession.id}:`,
      error,
    );
    return {};
  }
}

async function finalizeArchivedSessionSandbox(
  sessionId: string,
  logPrefix: string,
): Promise<void> {
  try {
    const archivedSession = await getSessionById(sessionId);
    if (!archivedSession || archivedSession.status !== "archived") {
      return;
    }
    if (!canOperateOnSandbox(archivedSession.sandboxState)) {
      return;
    }

    const sandbox = await connectSandbox(archivedSession.sandboxState);
    await sandbox.stop();

    await updateSession(sessionId, {
      snapshotUrl: null,
      snapshotCreatedAt: null,
      sandboxState: clearSandboxState(archivedSession.sandboxState),
      lifecycleState: "archived",
      sandboxExpiresAt: null,
      hibernateAfter: null,
      lifecycleError: null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `${logPrefix} Failed to stop sandbox for archived session ${sessionId}:`,
      error,
    );

    try {
      const sessionAfterFailure = await getSessionById(sessionId);
      if (!sessionAfterFailure || sessionAfterFailure.status !== "archived") {
        return;
      }

      const failurePatch: SessionUpdateInput = {
        lifecycleState: "archived",
        sandboxExpiresAt: null,
        hibernateAfter: null,
        lifecycleError: `Archive finalization failed: ${errorMessage}`,
      };

      if (
        !sessionAfterFailure.snapshotUrl &&
        canOperateOnSandbox(sessionAfterFailure.sandboxState)
      ) {
        failurePatch.sandboxState = clearSandboxState(
          sessionAfterFailure.sandboxState,
        );
      }

      await updateSession(sessionId, failurePatch);
    } catch (persistError) {
      console.error(
        `${logPrefix} Failed to persist archive recovery state for session ${sessionId}:`,
        persistError,
      );
    }
  }
}

/**
 * After Recoup (or any remote) has set `sessions.status` to `archived`, run the
 * same follow-up as the legacy local PATCH route: optional git branch refresh
 * from the live sandbox, then schedule sandbox stop + DB cleanup.
 */
export async function schedulePostRecoupArchiveSandboxFinalization(
  sessionId: string,
  options: {
    logPrefix?: string;
    scheduleBackgroundWork: (callback: () => Promise<void>) => void;
  },
): Promise<{ scheduled: boolean }> {
  const logPrefix = options.logPrefix ?? "[Sessions]";
  const current = await getSessionById(sessionId);
  if (!current || current.status !== "archived") {
    return { scheduled: false };
  }

  const gitStateUpdate = await refreshArchiveGitState(current, logPrefix);
  if (Object.keys(gitStateUpdate).length > 0) {
    await updateSession(sessionId, gitStateUpdate);
  }

  options.scheduleBackgroundWork(() =>
    finalizeArchivedSessionSandbox(sessionId, logPrefix),
  );

  return { scheduled: true };
}

export async function archiveSession(
  sessionId: string,
  options: ArchiveSessionOptions = {},
): Promise<ArchiveSessionResult> {
  const currentSession =
    options.currentSession ?? (await getSessionById(sessionId));

  if (!currentSession) {
    return { session: null, archiveTriggered: false };
  }

  const shouldStopSandboxAfterArchive = currentSession.status !== "archived";
  const logPrefix = options.logPrefix ?? "[Sessions]";
  const gitStateUpdate = shouldStopSandboxAfterArchive
    ? await refreshArchiveGitState(currentSession, logPrefix)
    : {};

  const updatePayload: SessionUpdateInput = {
    ...gitStateUpdate,
    ...options.update,
  };

  if (shouldStopSandboxAfterArchive) {
    updatePayload.status = "archived";
    updatePayload.lifecycleState = "archived";
    updatePayload.sandboxExpiresAt = null;
    updatePayload.hibernateAfter = null;
  }

  const updatedSession =
    Object.keys(updatePayload).length > 0
      ? ((await updateSession(sessionId, updatePayload)) ?? null)
      : currentSession;

  const archiveTriggered = shouldStopSandboxAfterArchive && !!updatedSession;

  if (archiveTriggered) {
    const runFinalize = () =>
      finalizeArchivedSessionSandbox(sessionId, logPrefix);

    if (options.scheduleBackgroundWork) {
      options.scheduleBackgroundWork(runFinalize);
    } else {
      void runFinalize();
    }
  }

  return {
    session: updatedSession,
    archiveTriggered,
  };
}
