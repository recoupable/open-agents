import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

export type CreateRecoupSessionChatBody = {
  /**
   * Optional client-supplied chat id. When supplied, the call is
   * idempotent on same-session re-requests and 409s when the id
   * exists on a different session.
   */
  id?: string;
};

export type CreatedRecoupSessionChat = {
  id: string;
  sessionId: string;
  title: string;
  modelId: string | null;
  activeStreamId: string | null;
  lastAssistantMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * POST `recoup-api/api/sessions/{sessionId}/chats` with Privy Bearer
 * auth. Returns the raw `Response` so callers can branch on status —
 * 200 returns `{ chat }`, 400 returns `{ error: "Invalid chat id" }`,
 * 409 returns `{ error: "Chat ID conflict" }`.
 */
export function createRecoupSessionChat(
  sessionId: string,
  body: CreateRecoupSessionChatBody,
  accessToken: string,
): Promise<Response> {
  return fetch(
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
}
