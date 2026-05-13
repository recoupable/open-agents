import type { WebAgentUIMessage } from "@/app/types";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

export type GetRecoupSessionChatResponse = {
  chat: {
    id: string;
    modelId: string | null;
    activeStreamId: string | null;
  };
  isStreaming: boolean;
  messages: WebAgentUIMessage[];
};

/**
 * GET `recoup-api/api/sessions/{sessionId}/chats/{chatId}` with Privy
 * Bearer auth. Throws on transport failure or non-2xx. Wraps an
 * explicit `cache: "no-store"` to keep the no-store refresh semantics
 * that the chat snapshot caller relies on.
 */
export async function getRecoupSessionChat(
  sessionId: string,
  chatId: string,
  accessToken: string,
): Promise<GetRecoupSessionChatResponse> {
  const res = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/sessions/${encodeURIComponent(
      sessionId,
    )}/chats/${encodeURIComponent(chatId)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    throw new Error(`getRecoupSessionChat: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<GetRecoupSessionChatResponse>;
}
