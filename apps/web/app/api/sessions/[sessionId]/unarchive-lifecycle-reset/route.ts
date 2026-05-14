import { getSessionById, updateSession } from "@/lib/db/sessions";
import { getServerSession } from "@/lib/session/get-server-session";

/**
 * POST after a successful Recoup `PATCH` that set `status: "running"` from
 * `archived`. Clears lifecycle fields the legacy local PATCH used to reset.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await getServerSession();
  if (!auth?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { sessionId } = await params;
  const existing = await getSessionById(sessionId);

  if (!existing) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (existing.userId !== auth.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.status !== "running") {
    return Response.json(
      {
        error:
          "Session is not active in the database yet. Retry unarchive in a moment.",
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

  return Response.json({ ok: true });
}
