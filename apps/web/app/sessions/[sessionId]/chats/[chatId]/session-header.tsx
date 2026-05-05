"use client";

import { ExternalLink, FolderGit2, PanelLeft } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useGitPanel } from "./git-panel-context";
import { useSessionLayout } from "@/app/sessions/[sessionId]/session-layout-context";

/**
 * Session header that uses only layout-level data (persists across chat switches).
 * Sandbox-specific props are removed to prevent layout shift during navigation.
 */
export function SessionHeader() {
  const { toggleSidebar } = useSidebar();
  const {
    gitPanelOpen,
    setGitPanelOpen,
    setGitPanelTab,
    hasActionNeeded,
    changesCount,
    hasCommittedChanges,
    headerActionsRef,
  } = useGitPanel();
  const { session } = useSessionLayout();

  const GitIcon = FolderGit2;
  const iconColor: string | undefined = undefined;

  // Build contextual tooltip
  const tooltipText = useMemo(() => {
    const parts: string[] = [];
    if (changesCount > 0) {
      parts.push(
        `${changesCount} file${changesCount !== 1 ? "s" : ""} changed`,
      );
    }
    if (hasActionNeeded) {
      parts.push("Uncommitted changes");
    }
    return parts.length > 0 ? parts.join(" · ") : "Git panel";
  }, [changesCount, hasActionNeeded]);

  const openGitPanel = useCallback(() => {
    const defaultTab =
      hasActionNeeded || hasCommittedChanges || changesCount > 0
        ? "diff"
        : "files";

    setGitPanelTab(defaultTab);
    setGitPanelOpen(true);
  }, [
    hasActionNeeded,
    hasCommittedChanges,
    changesCount,
    setGitPanelOpen,
    setGitPanelTab,
  ]);

  const handleGitPanelToggle = useCallback(() => {
    if (gitPanelOpen) {
      setGitPanelOpen(false);
      return;
    }

    openGitPanel();
  }, [gitPanelOpen, openGitPanel, setGitPanelOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isGitPanelShortcut =
        event.code === "KeyB" &&
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        !event.altKey;

      if (!isGitPanelShortcut || event.repeat) {
        return;
      }

      event.preventDefault();
      handleGitPanelToggle();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleGitPanelToggle]);

  return (
    <header className="border-b border-border px-3 py-1.5">
      <div className="flex items-center justify-between gap-2">
        {/* Left side: panel toggle + repo/branch + title */}
        <div className="flex min-w-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={toggleSidebar}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle left sidebar</TooltipContent>
          </Tooltip>

          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            {session.repoName && (
              <div className="hidden min-w-0 items-center gap-1.5 sm:flex">
                {session.cloneUrl ? (
                  /* oxlint-disable-next-line nextjs/no-html-link-for-pages */
                  <a
                    href={`https://github.com/${session.repoOwner}/${session.repoName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 truncate font-medium text-foreground hover:underline"
                  >
                    {session.repoName}
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                ) : (
                  <span className="truncate font-medium text-foreground">
                    {session.repoName}
                  </span>
                )}
                {session.branch && (
                  <>
                    <span className="text-muted-foreground/40">/</span>
                    <span className="truncate font-mono text-muted-foreground">
                      {session.branch}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground/40">/</span>
              </div>
            )}
            <span className="truncate font-medium text-foreground sm:font-normal sm:text-muted-foreground">
              {session.title}
            </span>
          </div>
        </div>

        {/* Right side: dev server / code editor actions + git panel toggle */}
        <div className="flex items-center gap-1">
          {/* Portal target for dev server / code editor buttons (rendered from per-chat content) */}
          <div ref={headerActionsRef} className="flex items-center" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative h-7 w-7 shrink-0",
                  gitPanelOpen && "bg-accent text-accent-foreground",
                )}
                onClick={handleGitPanelToggle}
              >
                <GitIcon
                  className={cn("h-4 w-4", !gitPanelOpen && iconColor)}
                />
                {!gitPanelOpen && hasActionNeeded && (
                  <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-amber-500" />
                )}
                {!gitPanelOpen && !hasActionNeeded && hasCommittedChanges && (
                  <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-blue-500" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {`${tooltipText} · ⌘⇧B / Ctrl+Shift+B`}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
