import { requireAuthenticatedUser } from "@/app/api/sessions/_lib/session-context";
import { getUserPreferences } from "@/lib/db/user-preferences";
import { sanitizeUserPreferencesForSession } from "@/lib/model-access";
import { getServerSession } from "@/lib/session/get-server-session";

export async function GET(req: Request) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  // #region agent log
  fetch("http://127.0.0.1:7883/ingest/36a597d9-96ee-413f-9d22-e259ef503327", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "a703c1",
    },
    body: JSON.stringify({
      sessionId: "a703c1",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "api/settings/model-variants/route.ts:GET",
      message: "settings model-variants GET",
      data: { ok: true },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const session = await getServerSession();
  const raw = await getUserPreferences(authResult.userId);
  const sanitized = sanitizeUserPreferencesForSession(raw, session, req.url);

  return Response.json({ modelVariants: sanitized.modelVariants });
}

function mutatingNotSupported() {
  return Response.json(
    {
      error:
        "Model variants are not persisted in this deployment; only defaults are available.",
    },
    { status: 501 },
  );
}

export const POST = mutatingNotSupported;
export const PATCH = mutatingNotSupported;
export const DELETE = mutatingNotSupported;
