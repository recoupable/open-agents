"use client";

import { useEffect, useRef } from "react";
import { takeBootstrapPrompt } from "@/lib/sessions/personal-session-bootstrap-storage";

type UsePersonalSessionBootstrapParams = {
  chatId: string;
  hasMessages: boolean;
  /** True after Privy + chat hooks have hydrated; gating prevents the
   * effect from firing before `sendMessage` is connected to a live
   * agent stream. */
  ready: boolean;
  sendMessage: (message: { text: string }) => Promise<void> | void;
};

/**
 * Auto-submits the bootstrap prompt that the personal-session
 * onboarding flow stashed in `sessionStorage`. Fires at most once per
 * mount, only when the chat is brand-new (no persisted messages) and
 * a prompt is actually present for this `chatId`. Failure to submit
 * is swallowed — the user can still type a message themselves.
 */
export function usePersonalSessionBootstrap({
  chatId,
  hasMessages,
  ready,
  sendMessage,
}: UsePersonalSessionBootstrapParams) {
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current) return;
    if (!ready) return;
    if (hasMessages) return;

    const prompt = takeBootstrapPrompt(chatId);
    if (!prompt) return;

    triggeredRef.current = true;
    void Promise.resolve(sendMessage({ text: prompt })).catch((error) => {
      console.error("[usePersonalSessionBootstrap] failed to submit:", error);
    });
  }, [chatId, hasMessages, ready, sendMessage]);
}
