"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { RECOUPABLE_API_BASE_URL } from "@/lib/recoupable/api-base-url";
import { fetchAccountArtists } from "@/lib/recoupable/fetch-account-artists";
import { buildPersonalSessionBootstrapPrompt } from "@/lib/sessions/build-personal-session-bootstrap-prompt";
import { setPendingBootstrapPrompt } from "@/lib/sessions/pending-bootstrap-prompts";

type CreatePersonalSessionResponse = {
  session?: { id: string };
  chat?: { id: string };
  error?: string;
};

/**
 * Hook around `POST recoup-api/api/sessions` (the canonical workspace +
 * session provisioner since recoupable/api#618 — see PROGRESS.md
 * 2026-05-26). Sends an empty body so the api derives the cloneUrl via
 * `resolveSessionCloneUrl` → `ensurePersonalRepo`, which is the
 * recoupable/<accountId> bare-UUID naming convention.
 *
 * Replaces the old open-agents-side `POST /api/sessions/personal` route
 * (deleted). The bootstrap-prompt generation moved client-side: we fetch
 * artists ourselves and synthesize the auto-submitted first message via
 * `buildPersonalSessionBootstrapPrompt`, then stash through
 * `setPendingBootstrapPrompt` so the chat page submits it once the
 * sandbox is active.
 *
 * Re-entrant calls while a request is in flight are dropped via the
 * `isCreatingPersonal` state.
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

      const res = await fetch(`${RECOUPABLE_API_BASE_URL}/api/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as CreatePersonalSessionResponse;
      if (!res.ok || !data.session || !data.chat) {
        const message = data.error ?? "Failed to start your first session";
        toast.error(message);
        return;
      }

      // Generate the bootstrap prompt client-side now that the api owns
      // session creation. Reads artists from recoup-api with the same
      // Privy token; an empty result triggers the "scaffold first
      // artist" branch.
      const artists = await fetchAccountArtists(accessToken);
      const bootstrapPrompt = buildPersonalSessionBootstrapPrompt(artists);
      setPendingBootstrapPrompt(data.chat.id, bootstrapPrompt);

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
