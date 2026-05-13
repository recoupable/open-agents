import type { Chat } from "@/lib/db/schema";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

export type CreateRecoupSessionChatBody = {
  /**
   * Optional client-supplied chat id. When supplied, the call is
   * idempotent on same-session re-requests and 409s when the id
   * exists on a different session.
   */
  id?: string;
};

export type CreateRecoupSessionChatResult =
  | { ok: true; chat: Chat }
  | { ok: false; status: number; error: string };

/**
 * POST `recoup-api/api/sessions/{sessionId}/chats` with Privy Bearer
 * auth. Returns a discriminated union so callers pattern-match on
 * success vs. the documented failure statuses (400 invalid id, 404
 * missing session, 409 id conflict, etc.).
 */
export async function createRecoupSessionChat(
  sessionId: string,
  body: CreateRecoupSessionChatBody,
  accessToken: string,
): Promise<CreateRecoupSessionChatResult> {
  const res = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}/chats`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    },
  );

  const payload = (await res.json().catch(() => ({}))) as {
    chat?: Chat;
    error?: string;
  };

  if (res.ok && payload.chat) {
    return { ok: true, chat: payload.chat };
  }

  return {
    ok: false,
    status: res.status,
    error: payload.error ?? `createRecoupSessionChat: ${res.status}`,
  };
}
