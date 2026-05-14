import { after } from "next/server";
import { getSessionById } from "@/lib/db/sessions";
import { schedulePostRecoupArchiveSandboxFinalization } from "@/lib/sandbox/archive-session";
import { getServerSession } from "@/lib/session/get-server-session";

/**
 * POST after a successful Recoup `PATCH` that set `status: "archived"`.
 * Stops the Vercel sandbox and schedules snapshot/cleanup on the shared DB row.
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

  if (existing.status !== "archived") {
    return Response.json(
      {
        error:
          "Session is not archived in the database yet. Wait a moment and retry.",
      },
      { status: 409 },
    );
  }

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

  return Response.json({ ok: true });
}
