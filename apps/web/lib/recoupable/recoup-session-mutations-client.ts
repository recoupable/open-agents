import type { Session } from "@/lib/db/schema";
import { hasRuntimeSandboxState } from "@/lib/sandbox/utils";
import { patchRecoupSessionJson } from "./patch-recoup-session";

async function fetchLocalSession(sessionId: string): Promise<Session> {
  const res = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}`,
    { credentials: "same-origin" },
  );
  const raw = (await res.json()) as {
    session?: Session;
    error?: string;
    message?: string;
  };
  if (!res.ok || !raw.session) {
    throw new Error(raw.error ?? raw.message ?? "Failed to load session");
  }
  return raw.session;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let res = await fetch(url, init);
  if (res.status === 409) {
    await new Promise((r) => setTimeout(r, 450));
    res = await fetch(url, init);
  }
  return res;
}

/**
 * Recoup PATCH `status: "archived"` then open-agents-only sandbox stop / snapshot
 * scheduling (parity with the deleted local PATCH route).
 */
export async function archiveSessionViaRecoup(
  sessionId: string,
  getAccessToken: () => Promise<string | null>,
): Promise<Session> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const updated = await patchRecoupSessionJson(
    sessionId,
    { status: "archived" },
    token,
  );

  const finalizeRes = await fetchWithRetry(
    `/api/sessions/${encodeURIComponent(sessionId)}/archive-finalize`,
    { method: "POST", credentials: "same-origin" },
  );

  if (!finalizeRes.ok) {
    console.warn(
      "[archiveSessionViaRecoup] archive-finalize failed",
      finalizeRes.status,
      await finalizeRes.text().catch(() => ""),
    );
  }

  return updated;
}

/**
 * Validates unarchive using the shared DB row (same source as sandbox routes),
 * PATCHes Recoup to `running`, then clears lifecycle fields locally.
 */
export async function unarchiveSessionViaRecoup(
  sessionId: string,
  getAccessToken: () => Promise<string | null>,
): Promise<Session> {
  const existing = await fetchLocalSession(sessionId);

  if (existing.status !== "archived") {
    throw new Error("Session is not archived");
  }

  if (
    !existing.snapshotUrl &&
    hasRuntimeSandboxState(existing.sandboxState)
  ) {
    throw new Error(
      "Sandbox is still being paused for this archived session. Please try unarchiving again in a few seconds.",
    );
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await patchRecoupSessionJson(sessionId, { status: "running" }, token);

  const resetRes = await fetchWithRetry(
    `/api/sessions/${encodeURIComponent(sessionId)}/unarchive-lifecycle-reset`,
    { method: "POST", credentials: "same-origin" },
  );

  if (!resetRes.ok) {
    const raw = (await resetRes.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    throw new Error(
      raw.error ??
        raw.message ??
        `Failed to finalize unarchive (${resetRes.status})`,
    );
  }

  return fetchLocalSession(sessionId);
}
