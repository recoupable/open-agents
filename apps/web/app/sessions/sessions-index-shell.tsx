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
import { useSessionsShell } from "./sessions-shell-context";

export function SessionsIndexShell() {
  const { createBlankSession, isCreatingBlank } = useSessionsShell();

  const handleSelectOrg = useCallback(
    (orgSlug: string) => {
      void createBlankSession(orgSlug);
    },
    [createBlankSession],
  );

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
              {isCreatingBlank ? (
                <Loader2 className="animate-spin" />
              ) : (
                <MessageSquare />
              )}
            </EmptyMedia>
            <EmptyTitle>
              {isCreatingBlank
                ? "Starting a sandbox..."
                : "Select an Organization"}
            </EmptyTitle>
            <EmptyDescription>
              {isCreatingBlank
                ? "Your new sandbox is being provisioned."
                : "Choose an organization to start a new session."}
            </EmptyDescription>
          </EmptyHeader>
          {!isCreatingBlank && (
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
