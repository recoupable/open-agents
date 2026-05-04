import { connectSandbox } from "@open-harness/sandbox";
import {
  requireAuthenticatedUser,
  requireOwnedSession,
} from "@/app/api/sessions/_lib/session-context";
import { updateSession } from "@/lib/db/sessions";
import {
  enforceRateLimit,
  RATE_LIMITS,
  withRateLimitHeaders,
} from "@/lib/rate-limit";
import { handleCreateSandboxRequest } from "@/lib/sandbox/create-sandbox-handler";
import {
  canOperateOnSandbox,
  clearSandboxState,
  hasResumableSandboxState,
} from "@/lib/sandbox/utils";
import { getServerSession } from "@/lib/session/get-server-session";

export async function POST(req: Request): Promise<Response> {
  // Rate-limit by user identity when known; the underlying handler
  // performs its own auth check, so this is purely additive.
  const session = await getServerSession();
  const userId = session?.user?.id ?? null;

  const limit = await enforceRateLimit(req, RATE_LIMITS.sandboxCreate, userId);
  if (!limit.ok) return limit.response;

  const response = await handleCreateSandboxRequest(req);
  return withRateLimitHeaders(response, limit.headers);
}

export async function DELETE(req: Request) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const limit = await enforceRateLimit(
    req,
    RATE_LIMITS.sandboxCreate,
    authResult.userId,
  );
  if (!limit.ok) return limit.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withRateLimitHeaders(
      Response.json({ error: "Invalid JSON body" }, { status: 400 }),
      limit.headers,
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("sessionId" in body) ||
    typeof (body as Record<string, unknown>).sessionId !== "string"
  ) {
    return withRateLimitHeaders(
      Response.json({ error: "Missing sessionId" }, { status: 400 }),
      limit.headers,
    );
  }

  const { sessionId } = body as { sessionId: string };

  const sessionContext = await requireOwnedSession({
    userId: authResult.userId,
    sessionId,
  });
  if (!sessionContext.ok) {
    return withRateLimitHeaders(sessionContext.response, limit.headers);
  }

  const { sessionRecord } = sessionContext;

  // If there's no sandbox to stop, return success (idempotent)
  if (!canOperateOnSandbox(sessionRecord.sandboxState)) {
    return withRateLimitHeaders(
      Response.json({ success: true, alreadyStopped: true }),
      limit.headers,
    );
  }

  // Connect and stop using unified API
  const sandbox = await connectSandbox(sessionRecord.sandboxState);
  await sandbox.stop();

  const clearedState = clearSandboxState(sessionRecord.sandboxState);
  await updateSession(sessionId, {
    sandboxState: clearedState,
    snapshotUrl: null,
    snapshotCreatedAt: null,
    lifecycleState:
      hasResumableSandboxState(clearedState) || !!sessionRecord.snapshotUrl
        ? "hibernated"
        : "provisioning",
    sandboxExpiresAt: null,
    hibernateAfter: null,
    lifecycleRunId: null,
    lifecycleError: null,
  });

  return withRateLimitHeaders(
    Response.json({ success: true }),
    limit.headers,
  );
}