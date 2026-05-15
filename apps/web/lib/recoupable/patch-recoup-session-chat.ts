import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

export type PatchRecoupSessionChatBody = {
  title?: string;
  modelId?: string;
};

/**
 * Wire-format `chats` row as returned by the recoupable API
 * (`toChatResponse` shape: camelCase, ISO strings for timestamps).
 * Defined inline so this helper does not depend on the local Drizzle
 * schema declaration.
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

export type PatchRecoupSessionChatResponse = {
  chat: RecoupChat;
};

/**
 * PATCH `recoup-api/api/sessions/{sessionId}/chats/{chatId}` with
 * Privy Bearer auth. Throws on transport failure or non-2xx and
 * surfaces the server's `error` text when present so callers can
 * propagate it to the UI.
 */
export async function patchRecoupSessionChat(
  sessionId: string,
  chatId: string,
  body: PatchRecoupSessionChatBody,
  accessToken: string,
): Promise<PatchRecoupSessionChatResponse> {
  const res = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/sessions/${encodeURIComponent(
      sessionId,
    )}/chats/${encodeURIComponent(chatId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      payload.error ??
        `patchRecoupSessionChat: ${res.status} ${res.statusText}`,
    );
  }

  return res.json() as Promise<PatchRecoupSessionChatResponse>;
}
