"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useState } from "react";
import type { SandboxInfo } from "@/app/sessions/[sessionId]/chats/[chatId]/session-chat-context";
import type { Session } from "@/lib/db/schema";
import { createSandbox } from "@/lib/sandbox/create-sandbox";
import {
  getSandboxCreateErrorDetails,
  type SandboxCreateErrorDetails,
} from "@/lib/sandbox/get-sandbox-create-error-details";
import { isSandboxValid } from "@/lib/sandbox/is-sandbox-valid";

type SessionFields = Pick<
  Session,
  "id" | "cloneUrl" | "branch" | "isNewBranch" | "prNumber"
>;

type CreatedSandbox = SandboxInfo & { type: string };

type UseSandboxCreateParams = {
  session: SessionFields;
  sandboxInfo: SandboxInfo | null;
  preferredSandboxType: string | undefined;
  setSandboxInfo: (info: CreatedSandbox) => void;
  setSandboxTypeFromUnknown: (type: unknown) => void;
  requestStatusSync: (mode?: "force" | "normal") => Promise<unknown>;
};

export function useSandboxCreate({
  session,
  sandboxInfo,
  preferredSandboxType,
  setSandboxInfo,
  setSandboxTypeFromUnknown,
  requestStatusSync,
}: UseSandboxCreateParams) {
  const { getAccessToken } = usePrivy();
  const [isCreatingSandbox, setIsCreatingSandbox] = useState(false);
  const [sandboxCreateError, setSandboxCreateError] =
    useState<SandboxCreateErrorDetails | null>(null);

  const runCreateSandbox = useCallback(async (): Promise<CreatedSandbox> => {
    const branchExistsOnOrigin = session.prNumber != null;
    const shouldCreateNewBranch = session.isNewBranch && !branchExistsOnOrigin;
    const accessToken = await getAccessToken();
    const newSandbox = await createSandbox(
      session.cloneUrl ?? undefined,
      session.branch ?? undefined,
      shouldCreateNewBranch,
      session.id,
      preferredSandboxType,
      accessToken,
    );
    setSandboxInfo(newSandbox);
    setSandboxTypeFromUnknown(newSandbox.type);
    void requestStatusSync("force");
    return newSandbox;
  }, [
    session.prNumber,
    session.isNewBranch,
    session.cloneUrl,
    session.branch,
    session.id,
    preferredSandboxType,
    getAccessToken,
    setSandboxInfo,
    setSandboxTypeFromUnknown,
    requestStatusSync,
  ]);

  const handleCreateNewSandbox = useCallback(async () => {
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
    }
  }, [runCreateSandbox]);

  const ensureSandboxReady = useCallback(async (): Promise<boolean> => {
    if (isSandboxValid(sandboxInfo)) {
      return true;
    }
    if (isCreatingSandbox) {
      return false;
    }

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
    }
  }, [sandboxInfo, isCreatingSandbox, runCreateSandbox]);

  return {
    isCreatingSandbox,
    sandboxCreateError,
    setSandboxCreateError,
    handleCreateNewSandbox,
    ensureSandboxReady,
  };
}
