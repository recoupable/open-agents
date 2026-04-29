"use client";

import { Loader2, MessageSquare } from "lucide-react";
import { useCallback } from "react";
import { OrgSelector } from "@/components/org-selector";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePersonalSessionFallback } from "@/hooks/use-personal-session";
import { useSessionsShell } from "./sessions-shell-context";

export function SessionsIndexShell() {
  const { createBlankSession, isCreatingBlank } = useSessionsShell();
  const { isProvisioning } = usePersonalSessionFallback({
    enabled: !isCreatingBlank,
  });

  const handleSelectOrg = useCallback(
    (cloneUrl: string) => {
      void createBlankSession(cloneUrl);
    },
    [createBlankSession],
  );

  const showLoadingState = isCreatingBlank || isProvisioning;

  return (
    <>
      <header className="border-b border-border px-3 py-2 lg:px-4 lg:py-3">
        <div className="flex min-h-8 items-center gap-2">
          <SidebarTrigger className="shrink-0" />
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {showLoadingState ? (
                <Loader2 className="animate-spin" />
              ) : (
                <MessageSquare />
              )}
            </EmptyMedia>
            <EmptyTitle>
              {showLoadingState
                ? "Setting up your workspace..."
                : "Select an Organization"}
            </EmptyTitle>
            <EmptyDescription>
              {showLoadingState
                ? "Provisioning a sandbox for your first session."
                : "Choose an organization to start a new session."}
            </EmptyDescription>
          </EmptyHeader>
          {!showLoadingState && (
            <EmptyContent>
              <OrgSelector
                onSelectOrg={handleSelectOrg}
                disabled={isCreatingBlank}
              />
            </EmptyContent>
          )}
        </Empty>
      </div>
    </>
  );
}
