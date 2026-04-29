"use client";

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
 * Hook around `POST /api/sessions/personal`. Handles the loading state +
 * navigation to the freshly-created chat, surfaces any server error as a
 * toast. Mounted in the sessions shell so the empty-orgs auto-trigger and
 * any future explicit "Start a personal session" affordance share one
 * source of truth for the request lifecycle.
 *
 * Re-entrant calls while a request is in flight are dropped — the loading
 * state guards against double-invocation.
 */
export function useCreatePersonalSession() {
  const router = useRouter();
  const [isCreatingPersonal, setIsCreatingPersonal] = useState(false);

  const createPersonalSession = useCallback(async () => {
    if (isCreatingPersonal) return;
    setIsCreatingPersonal(true);
    try {
      const res = await fetch("/api/sessions/personal", { method: "POST" });
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
  }, [isCreatingPersonal, router]);

  return { createPersonalSession, isCreatingPersonal };
}
