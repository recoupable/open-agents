"use client";

import { useEffect, useRef } from "react";

type UsePersonalSessionBootstrapParams = {
  bootstrapPrompt: string | null;
  hasMessages: boolean;
  /** True after Privy + chat hooks have hydrated; gating prevents the
   * effect from firing before `sendMessage` is connected to a live
   * agent stream. */
  ready: boolean;
  sendMessage: (message: { text: string }) => Promise<void> | void;
};

/**
 * Auto-submits the bootstrap prompt that the personal-session
 * onboarding flow includes in the chat URL query. Fires at most once
 * per mount, only when the chat is brand-new (no persisted messages)
 * and a prompt is present. Failure to submit is swallowed — the user
 * can still type a message themselves.
 */
export function usePersonalSessionBootstrap({
  bootstrapPrompt,
  hasMessages,
  ready,
  sendMessage,
}: UsePersonalSessionBootstrapParams) {
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current) return;
    if (!ready) return;
    if (hasMessages) return;

    if (!bootstrapPrompt) return;

    triggeredRef.current = true;
    void Promise.resolve(sendMessage({ text: bootstrapPrompt }))
      .catch((error) => {
        console.error("[usePersonalSessionBootstrap] failed to submit:", error);
      })
      .finally(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("bootstrapPrompt");
        window.history.replaceState(window.history.state, "", url.toString());
      });
  }, [bootstrapPrompt, hasMessages, ready, sendMessage]);
}
