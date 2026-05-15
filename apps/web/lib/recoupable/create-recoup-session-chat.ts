import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

/**
 * Wire-format `chats` row as returned by the recoupable API
 * (`toChatResponse` shape: camelCase keys, ISO strings for
 * timestamps). Defined inline so this helper does not depend on the
 * local Drizzle schema declaration.
 */
export type RecoupChat = {
  id: string;
  sessionId: string;
  title: string;
  modelId: string | null;
  activeStreamId: string | null;
  lastAssistantMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecoupSessionChatBody = {
  /**
   * Optional client-supplied chat id. When supplied, the call is
   * idempotent on same-session re-requests and 409s when the id
   * exists on a different session.
   */
  id?: string;
};

/**
 * POST `recoup-api/api/sessions/{sessionId}/chats` with Privy Bearer
 * auth. Returns the created (or existing, on idempotent reuse) chat.
 * Throws on transport failure or non-2xx — the thrown error message
 * carries the server's `error` field when present (e.g. `Invalid chat
 * id`, `Chat ID conflict`) so callers can surface it directly.
 */
export async function createRecoupSessionChat(
  sessionId: string,
  body: CreateRecoupSessionChatBody,
  accessToken: string,
): Promise<RecoupChat> {
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
    chat?: RecoupChat;
    error?: string;
  };

  if (!res.ok || !payload.chat) {
    throw new Error(
      payload.error ??
        `createRecoupSessionChat: ${res.status} ${res.statusText}`,
    );
  }

  return payload.chat;
}
