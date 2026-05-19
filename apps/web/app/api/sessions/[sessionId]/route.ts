import {
  requireAuthenticatedUser,
  requireOwnedSession,
} from "@/app/api/sessions/_lib/session-context";
import { deleteSession } from "@/lib/db/sessions";

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
