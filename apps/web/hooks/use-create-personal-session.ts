"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Chat, Session } from "@/lib/db/schema";

type CreatePersonalSessionResponse = {
  session?: Session;
  chat?: Chat;
  error?: string;
};

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
