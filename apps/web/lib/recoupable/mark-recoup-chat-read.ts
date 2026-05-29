import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

/**
 * POST `recoup-api/api/sessions/{sessionId}/chats/{chatId}/read` with
 * Privy Bearer auth. Upserts `chat_reads.last_read_at` so subsequent
 * list-chats calls report `hasUnread: false` for this chat.
 * Throws on transport failure or non-2xx.
 */
export async function markRecoupChatRead(
  sessionId: string,
  chatId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}/chats/${encodeURIComponent(chatId)}/read`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const payload = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
  };

  if (!res.ok || !payload.success) {
    throw new Error(
      payload.error ?? `markRecoupChatRead: ${res.status} ${res.statusText}`,
    );
  }
}
