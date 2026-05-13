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
      location: "api/settings/preferences/route.ts:GET",
      message: "settings preferences GET",
      data: { ok: true },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const session = await getServerSession();
  const raw = await getUserPreferences(authResult.userId);
  const preferences = sanitizeUserPreferencesForSession(raw, session, req.url);

  return Response.json({ preferences });
}

/**
 * Preferences are not stored server-side (see `lib/db/user-preferences.ts`).
 * This handler acknowledges PATCH so the settings UI does not error; the
 * response always reflects account defaults until persistence is restored.
 */
export async function PATCH(req: Request) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  await req.json().catch(() => undefined);

  const session = await getServerSession();
  const raw = await getUserPreferences(authResult.userId);
  const preferences = sanitizeUserPreferencesForSession(raw, session, req.url);

  return Response.json({ preferences });
}
