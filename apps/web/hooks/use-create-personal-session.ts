"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Chat, Session } from "@/lib/db/schema";

type CreatePersonalSessionResponse = {
  session?: Session;
  chat?: Chat;
  bootstrapPrompt?: string;
  error?: string;
};

async function sendBootstrapMessageViaChatApi(params: {
  sessionId: string;
  chatId: string;
  prompt: string;
  accessToken: string;
}) {
  const bootstrapMessageId = crypto.randomUUID();
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: params.sessionId,
      chatId: params.chatId,
      recoupAccessToken: params.accessToken,
      messages: [
        {
          id: bootstrapMessageId,
          role: "user",
          parts: [{ type: "text", text: params.prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "Failed to bootstrap initial message");
  }

  // We only need to start the workflow; the chat page will reconnect.
  void response.body?.cancel();
}

/**
 * Hook around `POST /api/sessions/personal`. Pulls the Privy access token
 * via the SDK and forwards it as `Authorization: Bearer <token>` so the
 * server can call recoup-api on the user's behalf without reaching into
 * the privy-token cookie itself. Handles the loading state + navigation
 * to the freshly-created chat, and surfaces any server error as a toast.
 *
 * Re-entrant calls while a request is in flight are dropped — the loading
 * state guards against double-invocation.
 */
export function useCreatePersonalSession() {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [isCreatingPersonal, setIsCreatingPersonal] = useState(false);

  const createPersonalSession = useCallback(async () => {
    if (isCreatingPersonal) return;
    setIsCreatingPersonal(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error("Failed to authenticate; please sign out and back in.");
        return;
      }

      const res = await fetch("/api/sessions/personal", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as CreatePersonalSessionResponse;
      if (!res.ok || !data.session || !data.chat) {
        const message = data.error ?? "Failed to start your first session";
        toast.error(message);
        return;
      }
      if (data.bootstrapPrompt) {
        try {
          await sendBootstrapMessageViaChatApi({
            sessionId: data.session.id,
            chatId: data.chat.id,
            prompt: data.bootstrapPrompt,
            accessToken,
          });
        } catch (error) {
          console.error("[useCreatePersonalSession] bootstrap failed:", error);
          toast.error("Session created, but failed to send the first message");
        }
      }
      router.push(`/sessions/${data.session.id}/chats/${data.chat.id}`);
    } catch (error) {
      console.error("[useCreatePersonalSession] failed:", error);
      toast.error("Failed to start your first session");
    } finally {
      setIsCreatingPersonal(false);
    }
  }, [getAccessToken, isCreatingPersonal, router]);

  return { createPersonalSession, isCreatingPersonal };
}
