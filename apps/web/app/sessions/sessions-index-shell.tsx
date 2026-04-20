"use client";

import { Loader2, MessageSquare, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSessions } from "@/hooks/use-sessions";
import { useSessionsShell } from "./sessions-shell-context";

export function SessionsIndexShell() {
  const { createBlankSession, isCreatingBlank } = useSessionsShell();
  const { sessions, loading } = useSessions({ includeArchived: false });
  const autoCreatedRef = useRef(false);

  // First-time (or all-archived) users get dropped straight into a fresh
  // sandbox session instead of seeing an empty list with a dialog.
  useEffect(() => {
    if (loading || isCreatingBlank || autoCreatedRef.current) return;
    if (sessions.length > 0) return;
    autoCreatedRef.current = true;
    void createBlankSession();
  }, [loading, sessions.length, createBlankSession, isCreatingBlank]);

  const showCreating = isCreatingBlank || loading;

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
              {showCreating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <MessageSquare />
              )}
            </EmptyMedia>
            <EmptyTitle>
              {showCreating ? "Starting a sandbox…" : "Select a Session"}
            </EmptyTitle>
            <EmptyDescription>
              {showCreating
                ? "Your new sandbox is being provisioned."
                : "Choose a session from the sidebar to continue, or start a new one."}
            </EmptyDescription>
          </EmptyHeader>
          {!showCreating && (
            <EmptyContent>
              <Button onClick={createBlankSession}>
                <Plus className="h-4 w-4" />
                New Session
              </Button>
            </EmptyContent>
          )}
        </Empty>
      </div>
    </>
  );
}
