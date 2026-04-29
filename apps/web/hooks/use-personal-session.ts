"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Chat, Session } from "@/lib/db/schema";
import { useOrgs } from "@/hooks/use-orgs";

type CreatePersonalSessionResponse = {
  session?: Session;
  chat?: Chat;
  error?: string;
};

/**
 * Auto-onboards a logged-in user who belongs to zero Recoupable organizations
 * by silently provisioning a personal `recoupable/<name>-<account_id>` repo
 * (server-side, via `POST /api/sessions/personal`) and routing them straight
 * into the freshly-created session.
 *
 * - No-op while orgs are still loading.
 * - No-op when the user has at least one org (the OrgSelector flow handles them).
 * - Fires at most once per mount; we deliberately do not retry on failure to
 *   avoid runaway provisioning loops if the upstream API is broken.
 */
export function usePersonalSessionFallback(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const router = useRouter();
  const { orgs, loading: orgsLoading, error: orgsError } = useOrgs();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const triggeredRef = useRef(false);

  const provision = useCallback(async () => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    setIsProvisioning(true);
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
      console.error("[usePersonalSessionFallback] failed:", error);
      toast.error("Failed to start your first session");
    } finally {
      setIsProvisioning(false);
    }
  }, [router]);

  useEffect(() => {
    if (!enabled) return;
    if (orgsLoading) return;
    if (orgsError) return;
    if (orgs.length > 0) return;
    void provision();
  }, [enabled, orgs.length, orgsError, orgsLoading, provision]);

  const shouldShowProvisioning =
    isProvisioning || (!orgsLoading && orgs.length === 0 && !orgsError);

  return {
    isProvisioning: shouldShowProvisioning,
  };
}
