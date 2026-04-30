/** POST endpoint used by `AbortableChatTransport` and imperative callers. */
export const CHAT_API_POST_PATH = "/api/chat";

export type ChatApiCommonBodyFields = {
  sessionId: string;
  chatId: string;
  recoupAccessToken?: string;
  context?: { contextLimit: number };
};

export function buildChatApiCommonBody(params: {
  sessionId: string;
  chatId: string;
  recoupAccessToken?: string | null;
  contextLimit?: number | null;
}): ChatApiCommonBodyFields {
  const body: ChatApiCommonBodyFields = {
    sessionId: params.sessionId,
    chatId: params.chatId,
  };

  if (params.recoupAccessToken) {
    body.recoupAccessToken = params.recoupAccessToken;
  }

  if (params.contextLimit != null) {
    body.context = { contextLimit: params.contextLimit };
  }

  return body;
}

export async function postChatApi(body: unknown): Promise<Response> {
  return fetch(CHAT_API_POST_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
