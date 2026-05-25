"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useRef, useState } from "react";
import type { SandboxInfo } from "@/app/sessions/[sessionId]/chats/[chatId]/session-chat-context";
import type { Session } from "@/lib/db/schema";
import { createSandbox } from "@/lib/sandbox/create-sandbox";
import {
  getSandboxCreateErrorDetails,
  type SandboxCreateErrorDetails,
} from "@/lib/sandbox/get-sandbox-create-error-details";
import { isSandboxValid } from "@/lib/sandbox/is-sandbox-valid";

type SessionFields = Pick<Session, "id" | "cloneUrl">;

type CreatedSandbox = SandboxInfo & { type: string };

type UseSandboxCreateParams = {
  session: SessionFields;
  sandboxInfo: SandboxInfo | null;
  setSandboxInfo: (info: CreatedSandbox) => void;
  setSandboxTypeFromUnknown: (type: unknown) => void;
  requestStatusSync: (mode?: "force" | "normal") => Promise<unknown>;
};

export function useSandboxCreate({
  session,
  sandboxInfo,
  setSandboxInfo,
  setSandboxTypeFromUnknown,
  requestStatusSync,
}: UseSandboxCreateParams) {
  const { ready, getAccessToken } = usePrivy();
  const [isCreatingSandbox, setIsCreatingSandbox] = useState(false);
  const [sandboxCreateError, setSandboxCreateError] =
    useState<SandboxCreateErrorDetails | null>(null);
  // Synchronous guard — React state updates are batched, so two rapid calls
  // can both read `isCreatingSandbox === false` and double-start a create.
  const createInFlightRef = useRef(false);

  const runCreateSandbox = useCallback(async (): Promise<CreatedSandbox> => {
    if (!session.cloneUrl) {
      throw new Error("Session is missing a clone URL");
    }
    // Cross-origin call to recoup-api needs the user's Privy JWT so
    // `validateAuthContext` accepts the request (same Bearer pattern
    // the chat-workflow cutover uses). recoup-api falls back to 401
    // when no token is provided, so let the call go through and
    // surface that error rather than guarding it client-side.
    const recoupAccessToken = await getAccessToken().catch(() => null);
    const newSandbox = await createSandbox(
      session.cloneUrl,
      session.id,
      recoupAccessToken,
    );
    setSandboxInfo(newSandbox);
    setSandboxTypeFromUnknown(newSandbox.type);
    requestStatusSync("force").catch(() => undefined);
    return newSandbox;
  }, [
    session.cloneUrl,
    session.id,
    getAccessToken,
    setSandboxInfo,
    setSandboxTypeFromUnknown,
    requestStatusSync,
  ]);

  const handleCreateNewSandbox = useCallback(async () => {
    if (!ready) return;
    if (createInFlightRef.current) return;
    createInFlightRef.current = true;
    setIsCreatingSandbox(true);
    setSandboxCreateError(null);

    try {
      await runCreateSandbox();
      setSandboxCreateError(null);
    } catch (err) {
      const details = getSandboxCreateErrorDetails(err);
      setSandboxCreateError(details);
      console.error("Failed to create sandbox:", err);
    } finally {
      setIsCreatingSandbox(false);
      createInFlightRef.current = false;
    }
  }, [ready, runCreateSandbox]);

  const ensureSandboxReady = useCallback(async (): Promise<boolean> => {
    if (isSandboxValid(sandboxInfo)) {
      return true;
    }
    if (!ready) {
      return false;
    }
    if (createInFlightRef.current) {
      return false;
    }
    createInFlightRef.current = true;

    try {
      setIsCreatingSandbox(true);
      setSandboxCreateError(null);
      await runCreateSandbox();
      setSandboxCreateError(null);
      return true;
    } catch (err) {
      const details = getSandboxCreateErrorDetails(err);
      setSandboxCreateError(details);
      console.error("Failed to create sandbox:", err);
      return false;
    } finally {
      setIsCreatingSandbox(false);
      createInFlightRef.current = false;
    }
  }, [sandboxInfo, ready, runCreateSandbox]);

  return {
    isCreatingSandbox,
    sandboxCreateError,
    setSandboxCreateError,
    handleCreateNewSandbox,
    ensureSandboxReady,
  };
}
