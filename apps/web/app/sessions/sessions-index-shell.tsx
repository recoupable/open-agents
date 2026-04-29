"use client";

import { Loader2, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
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
import { useOrgs } from "@/hooks/use-orgs";
import { useSessionsShell } from "./sessions-shell-context";

export function SessionsIndexShell() {
  const {
    createBlankSession,
    isCreatingBlank,
    createPersonalSession,
    isCreatingPersonal,
  } = useSessionsShell();
  const { orgs, loading: orgsLoading, error: orgsError } = useOrgs();
  const personalProvisionTriggeredRef = useRef(false);

  // When the user belongs to zero orgs, fall back to the personal-repo flow
  // so they're never dead-ended on an empty selector. Fires at most once per
  // mount; we deliberately don't retry on failure (the toast tells the user
  // and a manual refresh is cheaper than a runaway provisioning loop).
  useEffect(() => {
    if (orgsLoading || orgsError) return;
    if (orgs.length > 0) return;
    if (isCreatingBlank || isCreatingPersonal) return;
    if (personalProvisionTriggeredRef.current) return;
    personalProvisionTriggeredRef.current = true;
    void createPersonalSession();
  }, [
    createPersonalSession,
    isCreatingBlank,
    isCreatingPersonal,
    orgs.length,
    orgsError,
    orgsLoading,
  ]);

  const handleSelectOrg = useCallback(
    (cloneUrl: string) => {
      void createBlankSession(cloneUrl);
    },
    [createBlankSession],
  );

  const showLoadingState =
    isCreatingBlank ||
    isCreatingPersonal ||
    (!orgsLoading && !orgsError && orgs.length === 0);

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
