"use client";

import type { Session } from "@/lib/db/schema";
import {
  interpretRecoupPatchSessionResponse,
  patchRecoupSession,
  type PatchRecoupSessionBody,
} from "@/lib/recoupable/patch-recoup-session";

/** Match prior open-agents route: trim title, omit empty title-only patches. */
function normalizePatchBody(body: PatchRecoupSessionBody): PatchRecoupSessionBody | null {
  const out: PatchRecoupSessionBody = {};
  if (body.title !== undefined) {
    const trimmed = typeof body.title === "string" ? body.title.trim() : "";
    if (trimmed) {
      out.title = trimmed;
    }
  }
  if (body.status !== undefined) {
    out.status = body.status;
  }
  if (body.linesAdded !== undefined) {
    out.linesAdded = body.linesAdded;
  }
  if (body.linesRemoved !== undefined) {
    out.linesRemoved = body.linesRemoved;
  }
  if (Object.keys(out).length === 0) {
    return null;
  }
  return out;
}

/**
 * PATCH session on Recoup (`RECOUPABLE_API_BASE_URL`), same transport as
 * `listRecoupSessionChats` / `createRecoupSessionChat`.
 */
export async function patchOwnSession(
  sessionId: string,
  body: PatchRecoupSessionBody,
  accessToken: string,
): Promise<Session> {
  const recoupPatch = normalizePatchBody(body);
  if (!recoupPatch) {
    throw new Error("At least one field is required");
  }

  let res = await patchRecoupSession(sessionId, recoupPatch, accessToken);
  if (res.status === 409 && recoupPatch.status === "running") {
    await new Promise((r) => setTimeout(r, 450));
    res = await patchRecoupSession(sessionId, recoupPatch, accessToken);
  }

  const result = await interpretRecoupPatchSessionResponse(res);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.session;
}
