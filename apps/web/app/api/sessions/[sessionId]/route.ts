import { after } from "next/server";
import {
  requireAuthenticatedUser,
  requireOwnedSession,
} from "@/app/api/sessions/_lib/session-context";
import {
  deleteSession,
  getSessionById,
  updateSession,
} from "@/lib/db/sessions";
import {
  interpretRecoupPatchSessionResponse,
  patchRecoupSession,
  type PatchRecoupSessionBody,
} from "@/lib/recoupable/patch-recoup-session";
import { schedulePostRecoupArchiveSandboxFinalization } from "@/lib/sandbox/archive-session";
import { hasRuntimeSandboxState } from "@/lib/sandbox/utils";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { sessionId } = await context.params;
  const owned = await requireOwnedSession({
    userId: authResult.userId,
    sessionId,
  });
  if (!owned.ok) {
    return owned.response;
  }

  return Response.json({ session: owned.sessionRecord });
}

/**
 * Mirrors production: one PATCH for session mutations. Forwards Bearer to Recoup,
 * then runs open-agents sandbox / lifecycle parity (same as pre–PR #31 local PATCH).
 */
export async function PATCH(req: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { sessionId } = await context.params;
  const owned = await requireOwnedSession({
    userId: authResult.userId,
    sessionId,
  });
  if (!owned.ok) {
    return owned.response;
  }

  const existingSession = owned.sessionRecord;

  let body: Partial<PatchRecoupSessionBody>;
  try {
    body = (await req.json()) as Partial<PatchRecoupSessionBody>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const recoupPatch: PatchRecoupSessionBody = {};
  if (body.title !== undefined) {
    const trimmed = typeof body.title === "string" ? body.title.trim() : "";
    if (trimmed) {
      recoupPatch.title = trimmed;
    }
  }
  if (body.status !== undefined) {
    recoupPatch.status = body.status;
  }
  if (body.linesAdded !== undefined) {
    recoupPatch.linesAdded = body.linesAdded;
  }
  if (body.linesRemoved !== undefined) {
    recoupPatch.linesRemoved = body.linesRemoved;
  }

  if (Object.keys(recoupPatch).length === 0) {
    return Response.json(
      { error: "At least one field is required" },
      { status: 400 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const bearer =
    typeof authHeader === "string" && /^Bearer\s+/i.test(authHeader)
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : "";
  if (!bearer) {
    return Response.json(
      { error: "Missing Authorization Bearer token" },
      { status: 401 },
    );
  }

  const shouldStopSandboxAfterArchive =
    recoupPatch.status === "archived" &&
    existingSession.status !== "archived";

  const shouldUnarchivePrecheck =
    recoupPatch.status === "running" &&
    existingSession.status === "archived";

  if (
    shouldUnarchivePrecheck &&
    !existingSession.snapshotUrl &&
    hasRuntimeSandboxState(existingSession.sandboxState)
  ) {
    return Response.json(
      {
        error:
          "Sandbox is still being paused for this archived session. Please try unarchiving again in a few seconds.",
      },
      { status: 409 },
    );
  }

  const recoupRes = await patchRecoupSession(sessionId, recoupPatch, bearer);
  const recoupResult = await interpretRecoupPatchSessionResponse(recoupRes);
  if (!recoupResult.ok) {
    return Response.json(
      { error: recoupResult.error },
      { status: recoupResult.status },
    );
  }

  if (shouldStopSandboxAfterArchive) {
    const { scheduled } = await schedulePostRecoupArchiveSandboxFinalization(
      sessionId,
      { logPrefix: "[Sessions]", scheduleBackgroundWork: after },
    );
    if (!scheduled) {
      return Response.json(
        {
          error:
            "Session is not archived in the database yet. Wait a moment and retry.",
        },
        { status: 409 },
      );
    }
  }

  if (recoupPatch.status === "running") {
    const fresh = await getSessionById(sessionId);
    if (!fresh) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    if (fresh.status !== "running") {
      return Response.json(
        {
          error:
            "Session is not active in the database yet. Retry unarchive in a moment.",
        },
        { status: 409 },
      );
    }

    const lifecycleBlocksReset =
      (fresh.lifecycleState === "archived" ||
        fresh.lifecycleState === "hibernating") &&
      !fresh.snapshotUrl &&
      hasRuntimeSandboxState(fresh.sandboxState);

    if (lifecycleBlocksReset) {
      return Response.json(
        {
          error:
            "Sandbox is still being paused for this archived session. Please try unarchiving again in a few seconds.",
        },
        { status: 409 },
      );
    }

    await updateSession(sessionId, {
      lifecycleState: null,
      lifecycleError: null,
      sandboxExpiresAt: null,
      hibernateAfter: null,
    });
  }

  const finalSession = await getSessionById(sessionId);
  return Response.json({
    session: finalSession ?? recoupResult.session,
  });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { sessionId } = await context.params;
  const owned = await requireOwnedSession({
    userId: authResult.userId,
    sessionId,
  });
  if (!owned.ok) {
    return owned.response;
  }

  await deleteSession(sessionId);
  return Response.json({ success: true });
}
