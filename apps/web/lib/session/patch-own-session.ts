"use client";

import type { Session } from "@/lib/db/schema";
import {
  interpretRecoupPatchSessionResponse,
  patchRecoupSession,
  type PatchRecoupSessionBody,
} from "@/lib/recoupable/patch-recoup-session";

const UNARCHIVE_409_MAX_ATTEMPTS = 6;
const UNARCHIVE_409_RETRY_DELAY_MS = 500;

/** Trim title; omit empty title-only patches (matches Recoup PATCH validation). */
function normalizePatchBody(
  body: PatchRecoupSessionBody,
): PatchRecoupSessionBody | null {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Updates the user's session via Recoup `PATCH /api/sessions/{id}` with Privy
 * Bearer auth (Phase B — same pattern as list/create session chats).
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

  const isUnarchive = recoupPatch.status === "running";
  const maxAttempts = isUnarchive ? UNARCHIVE_409_MAX_ATTEMPTS : 1;

  let lastResult:
    | { ok: true; session: Session }
    | { ok: false; status: number; error: string }
    | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await patchRecoupSession(sessionId, recoupPatch, accessToken);
    const result = await interpretRecoupPatchSessionResponse(res);
    lastResult = result;

    if (result.ok) {
      return result.session;
    }

    if (result.status !== 409 || !isUnarchive) {
      break;
    }

    if (attempt < maxAttempts - 1) {
      await sleep(UNARCHIVE_409_RETRY_DELAY_MS);
    }
  }

  throw new Error(lastResult?.ok === false ? lastResult.error : "Request failed");
}
