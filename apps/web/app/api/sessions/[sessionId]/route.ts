import {
  deleteSession,
  getSessionById,
} from "@/lib/db/sessions";
import { getServerSession } from "@/lib/session/get-server-session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { sessionId } = await params;
  const existingSession = await getSessionById(sessionId);

  if (!existingSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (existingSession.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ session: existingSession });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { sessionId } = await params;
  const existingSession = await getSessionById(sessionId);

  if (!existingSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (existingSession.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteSession(sessionId);
  return Response.json({ success: true });
}
