import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

/**
 * DELETE `recoup-api/api/sessions/{sessionId}/chats/{chatId}` with
 * Privy Bearer auth. Throws on transport failure or non-2xx and
 * surfaces the server's `error` text when present so callers can
 * propagate it to the UI (e.g. the "only chat" guard returns 400 with
 * "Cannot delete the only chat in a session").
 */
export async function deleteRecoupSessionChat(
  sessionId: string,
  chatId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/sessions/${encodeURIComponent(
      sessionId,
    )}/chats/${encodeURIComponent(chatId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      payload.error ??
        `deleteRecoupSessionChat: ${res.status} ${res.statusText}`,
    );
  }
}
