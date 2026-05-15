import type { Session } from "@/lib/db/schema";
import { z } from "zod";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

/** Request body for Recoup `PATCH /api/sessions/{sessionId}` (matches public OpenAPI). */
export type PatchRecoupSessionBody = {
  title?: string;
  status?: Session["status"];
  linesAdded?: number;
  linesRemoved?: number;
};

const recoupErrorBodySchema = z
  .object({
    status: z.string().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

const sessionStatusEnum = z.enum([
  "running",
  "completed",
  "failed",
  "archived",
]);

/** Shared wire shape for `{ session }` from Recoup or open-agents GET session. */
export const recoupSessionWireSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    title: z.string(),
    status: sessionStatusEnum,
  })
  .passthrough();

const recoupPatchSessionSuccessSchema = z.object({
  session: recoupSessionWireSchema,
});

/**
 * PATCH `recoup-api/api/sessions/{sessionId}` with Privy Bearer auth.
 * Optional fields: rename (`title`), lifecycle `status`, persisted line counters.
 * Response shape: `{ session }` on 200 (same wire format as open-agents `Session`).
 */
export function patchRecoupSession(
  sessionId: string,
  body: PatchRecoupSessionBody,
  accessToken: string,
): Promise<Response> {
  return fetch(
    `${RECOUPABLE_API_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    },
  );
}

/** Parse Recoup PATCH response for route handlers (maps HTTP + body to success or error text). */
export async function interpretRecoupPatchSessionResponse(res: Response): Promise<
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string }
> {
  const raw: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const err = recoupErrorBodySchema.safeParse(raw);
    return {
      ok: false,
      status: res.status,
      error: err.success
        ? (err.data.error ?? err.data.message ?? "Request failed")
        : "Request failed",
    };
  }

  const ok = recoupPatchSessionSuccessSchema.safeParse(raw);
  if (!ok.success) {
    return {
      ok: false,
      status: 502,
      error: "Missing or invalid session in response",
    };
  }

  return { ok: true, session: ok.data.session as Session };
}
