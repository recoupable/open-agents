import {
  buildChatApiCommonBody,
  postChatApi,
} from "@/lib/chat/chat-api-client";

/**
 * Sends the personal-session onboarding prompt through the standard chat
 * endpoint so the agent workflow starts before navigating to the chat UI.
 */
export async function sendBootstrapMessageViaChatApi(params: {
  sessionId: string;
  chatId: string;
  prompt: string;
  accessToken: string;
}): Promise<void> {
  const bootstrapMessageId = crypto.randomUUID();
  const response = await postChatApi({
    ...buildChatApiCommonBody({
      sessionId: params.sessionId,
      chatId: params.chatId,
      recoupAccessToken: params.accessToken,
    }),
    messages: [
      {
        id: bootstrapMessageId,
        role: "user",
        parts: [{ type: "text", text: params.prompt }],
      },
    ],
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "Failed to bootstrap initial message");
  }

  // Only need to start the workflow; the chat page reconnects to the stream.
  void response.body?.cancel();
}
