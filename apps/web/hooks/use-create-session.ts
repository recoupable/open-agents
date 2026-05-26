"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { RECOUPABLE_API_BASE_URL } from "@/lib/recoupable/api-base-url";
import { fetchAccountArtists } from "@/lib/recoupable/fetch-account-artists";
import { buildPersonalSessionBootstrapPrompt } from "@/lib/sessions/build-personal-session-bootstrap-prompt";
import { setPendingBootstrapPrompt } from "@/lib/sessions/pending-bootstrap-prompts";

type CreateSessionApiResponse = {
  session?: { id: string };
  chat?: { id: string };
  error?: string;
};

type CreateSessionParams = {
  /**
   * Recoupable org id. When provided, recoup-api provisions the
   * session against `recoupable/<organizationId>` (validates org
   * membership). When omitted, the session is personal and uses the
   * caller's own workspace repo (`recoupable/<accountId>`).
   */
  organizationId?: string;
};

/**
 * Unified hook for creating a session — handles both personal and org
 * flows against `POST recoup-api/api/sessions` (which since
 * recoupable/api#620 owns the entire `{title?, organizationId?}`
 * contract). open-agents no longer constructs repo URLs or talks to
 * its own `/api/sessions` route from this path.
 *
 *   - `createSession()` — personal session. Generates a scaffold
 *     bootstrap prompt client-side (fetches artists, asks the agent
 *     to either create a first artist workspace or sync existing ones)
 *     and stashes it via `setPendingBootstrapPrompt` so the chat page
 *     auto-submits once the sandbox is active.
 *   - `createSession({ organizationId })` — org session. Skips the
 *     bootstrap prompt (the org's repo already has code; the agent
 *     can start from a real workspace).
 *
 * Re-entrant calls while a request is in flight are dropped via the
 * `isCreating` state.
 */
export function useCreateSession() {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [isCreating, setIsCreating] = useState(false);

  const createSession = useCallback(
    async ({ organizationId }: CreateSessionParams = {}) => {
      if (isCreating) return;
      setIsCreating(true);
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          toast.error("Failed to authenticate; please sign out and back in.");
          return;
        }

        const body = organizationId ? { organizationId } : {};
        const res = await fetch(`${RECOUPABLE_API_BASE_URL}/api/sessions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as CreateSessionApiResponse;
        if (!res.ok || !data.session || !data.chat) {
          const message = data.error ?? "Failed to start your session";
          toast.error(message);
          return;
        }

        // Personal sessions get an auto-submitted scaffold prompt;
        // org sessions skip it (their workspace already has code).
        if (!organizationId) {
          const artists = await fetchAccountArtists(accessToken);
          const bootstrapPrompt = buildPersonalSessionBootstrapPrompt(artists);
          setPendingBootstrapPrompt(data.chat.id, bootstrapPrompt);
        }

        router.push(`/sessions/${data.session.id}/chats/${data.chat.id}`);
      } catch (error) {
        console.error("[useCreateSession] failed:", error);
        toast.error("Failed to start your session");
      } finally {
        setIsCreating(false);
      }
    },
    [getAccessToken, isCreating, router],
  );

  return { createSession, isCreating };
}
