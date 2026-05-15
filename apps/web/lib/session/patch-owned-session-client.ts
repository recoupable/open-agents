"use client";

import type { Session } from "@/lib/db/schema";
import type { PatchRecoupSessionBody } from "@/lib/recoupable/patch-recoup-session";
import { recoupSessionWireSchema } from "@/lib/recoupable/patch-recoup-session";
import { z } from "zod";

const patchOwnSessionOkSchema = z
  .object({ session: recoupSessionWireSchema })
  .passthrough();

const patchOwnSessionErrSchema = z
  .object({
    error: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

function readError(raw: unknown, fallback: string): string {
  const p = patchOwnSessionErrSchema.safeParse(raw);
  return p.success
    ? (p.data.error ?? p.data.message ?? fallback)
    : fallback;
}

async function patchOnce(
  sessionId: string,
  body: PatchRecoupSessionBody,
  accessToken: string,
): Promise<Response> {
  return fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Updates the user's session row via local `PATCH /api/sessions/{id}`
 * (forwards Privy Bearer to Recoup and runs sandbox side effects on the server).
 */
export async function patchOwnedSession(
  sessionId: string,
  body: PatchRecoupSessionBody,
  accessToken: string,
): Promise<Session> {
  let res = await patchOnce(sessionId, body, accessToken);
  if (res.status === 409 && body.status === "running") {
    await new Promise((r) => setTimeout(r, 450));
    res = await patchOnce(sessionId, body, accessToken);
  }

  const raw: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(readError(raw, `Request failed (${res.status})`));
  }

  const ok = patchOwnSessionOkSchema.safeParse(raw);
  if (!ok.success) {
    throw new Error("Invalid session response");
  }

  return ok.data.session as Session;
}
