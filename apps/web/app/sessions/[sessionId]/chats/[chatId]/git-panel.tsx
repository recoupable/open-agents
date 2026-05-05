"use client";

import {
  Check,
  ChevronDown,
  ExternalLink,
  GitBranch,
  GitCommit,
  Globe,
  Loader2,
  RefreshCw,
  Sparkles,
  SquareDot,
  SquareMinus,
  SquarePlus,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DiffFile } from "@/app/api/sessions/[sessionId]/diff/route";
import type { Session } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  commitAndPushSessionChanges,
  createSessionBranch,
  discardSessionUncommittedChanges,
} from "@/lib/git-flow-client";
import type { SessionGitStatus } from "@/hooks/use-session-git-status";
import { useSessionFiles } from "@/hooks/use-session-files";
import { useGitPanel } from "./git-panel-context";
import { FileTree } from "./file-tree";
import { useSessionChatWorkspaceContext } from "./session-chat-context";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type GitPanelProps = {
  session: Session;
  // Git state
  hasRepo: boolean;
  hasExistingPr: boolean;
  prDeploymentUrl: string | null;
  buildingDeploymentUrl: string | null;
  failedDeploymentUrl: string | null;
  isDeploymentStale: boolean;
  isDeploymentFailed: boolean;
  hasUncommittedGitChanges: boolean;
  supportsRepoCreation: boolean;
  hasDiff: boolean;

  // Diff data
  diffFiles: DiffFile[] | null;
  diffSummary?: {
    totalAdditions: number;
    totalDeletions: number;
  } | null;
  diffRefreshing: boolean;

  // Actions
  refreshDiff: () => Promise<void>;

  // For inline commit
  hasSandbox: boolean;
  gitStatus: SessionGitStatus | null;
  gitStatusLoading: boolean;
  refreshGitStatus: () => Promise<SessionGitStatus | undefined>;
  onCommitted?: () => void;
  isAgentWorking: boolean;
};

/* ------------------------------------------------------------------ */
/* Diff file list for the panel's Diff tab                             */
/* ------------------------------------------------------------------ */

function DiffFileStatusIcon({ status }: { status: DiffFile["status"] }) {
  if (status === "added") {
    return <SquarePlus className="h-4 w-4 shrink-0 text-green-500" />;
  }
  if (status === "deleted") {
    return <SquareMinus className="h-4 w-4 shrink-0 text-red-500" />;
  }
  if (status === "renamed") {
    return <SquareDot className="h-4 w-4 shrink-0 text-yellow-500" />;
  }
  // modified
  return <SquareDot className="h-4 w-4 shrink-0 text-yellow-500" />;
}

function isUncommittedFile(file: DiffFile): boolean {
  return file.stagingStatus === "unstaged" || file.stagingStatus === "partial";
}

function canDiscardFile(file: DiffFile): boolean {
  return isUncommittedFile(file);
}

function DiffFileList({
  files,
  onDiscardFile,
  discardingFilePath,
  discardDisabled,
}: {
  files: DiffFile[];
  onDiscardFile: (file: DiffFile) => void;
  discardingFilePath: string | null;
  discardDisabled: boolean;
}) {
  const { openDiffToFile, diffScope } = useGitPanel();

  const filteredFiles =
    diffScope === "branch" ? files : files.filter(isUncommittedFile);

  if (filteredFiles.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/25 py-8 text-center">
        <p className="text-xs text-muted-foreground">
          {diffScope === "uncommitted"
            ? "No uncommitted changes"
            : "No file changes yet"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-px">
        {filteredFiles.map((file) => {
          const fileName = file.path.split("/").pop() ?? file.path;
          const dirPath = file.path.slice(0, -fileName.length);

          return (
            <div
              key={file.path}
              className="group flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
            >
              <button
                type="button"
                onClick={() => openDiffToFile(file.path)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <DiffFileStatusIcon status={file.status} />
                <div className="flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden">
                  <span className="shrink-0 font-mono text-xs font-medium text-foreground">
                    {fileName}
                  </span>
                  {dirPath && (
                    <span
                      className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted-foreground"
                      dir="rtl"
                    >
                      <bdi>{dirPath.replace(/\/$/, "")}</bdi>
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-[10px]">
                  {file.additions > 0 && (
                    <span className="text-green-600 dark:text-green-500">
                      +{file.additions}
                    </span>
                  )}
                  {file.deletions > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      -{file.deletions}
                    </span>
                  )}
                </div>
              </button>
              {canDiscardFile(file) ? (
                <button
                  type="button"
                  onClick={() => onDiscardFile(file)}
                  disabled={discardDisabled || discardingFilePath === file.path}
                  aria-label={`Discard changes in ${file.path}`}
                  className="rounded p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
                >
                  {discardingFilePath === file.path ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline commit panel (replaces the commit dialog)                    */
/* ------------------------------------------------------------------ */

function InlineCommitPanel({
  session,
  hasSandbox,
  gitStatus,
  refreshGitStatus,
  onCommitted,
  isAgentWorking,
  baseBranch,
}: {
  session: Session;
  hasSandbox: boolean;
  gitStatus: SessionGitStatus | null;
  refreshGitStatus: () => Promise<SessionGitStatus | undefined>;
  onCommitted?: () => void;
  isAgentWorking: boolean;
  baseBranch: string;
}) {
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitSuccess, setCommitSuccess] = useState<{
    commitSha?: string;
    commitMessage?: string;
  } | null>(null);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [resolvedBranch, setResolvedBranch] = useState<string | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasUncommittedChanges = gitStatus?.hasUncommittedChanges ?? false;
  const hasUnpushedCommits = gitStatus?.hasUnpushedCommits ?? false;
  const hasPendingGitWork = hasUncommittedChanges || hasUnpushedCommits;

  const branchFromStatus =
    resolvedBranch ??
    (gitStatus?.branch && gitStatus.branch !== "HEAD"
      ? gitStatus.branch
      : null);
  const currentBranch = branchFromStatus ?? session.branch ?? baseBranch;
  const displayBranch = currentBranch === "HEAD" ? baseBranch : currentBranch;
  const isDetachedHead = gitStatus?.isDetachedHead ?? false;
  const needsNewBranch = displayBranch === baseBranch || isDetachedHead;

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleCreateBranch = async () => {
    if (!hasSandbox) return;
    setIsCreatingBranch(true);
    setCommitError(null);
    try {
      const result = await createSessionBranch({
        sessionId: session.id,
        sessionTitle: session.title,
        baseBranch,
        branchName: displayBranch,
      });
      if (result.branchName !== "HEAD") {
        setResolvedBranch(result.branchName);
      }
      await refreshGitStatus();
    } catch (err) {
      setCommitError(
        err instanceof Error ? err.message : "Failed to create branch",
      );
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleExpandCommit = () => {
    setIsExpanded(true);
  };

  const handleGenerateMessage = async () => {
    setIsGeneratingMessage(true);
    try {
      const res = await fetch(
        `/api/sessions/${session.id}/generate-commit-message`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data.message) {
        setCommitMessage(data.message);
      }
    } catch {
      // silently fail
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleCommit = async (skipPush = false) => {
    if (!hasSandbox || !hasPendingGitWork) return;
    setIsCommitting(true);
    setCommitError(null);
    setCommitSuccess(null);

    try {
      const trimmed = commitMessage.trim();
      const lines = trimmed.split("\n");
      const commitTitle = lines[0] ?? "";
      const commitBody = lines.slice(1).join("\n").trim();

      const response = await commitAndPushSessionChanges({
        sessionId: session.id,
        sessionTitle: session.title,
        baseBranch,
        branchName: displayBranch,
        ...(commitTitle ? { commitTitle, commitBody } : {}),
        skipPush,
      });

      if (response.branchName && response.branchName !== "HEAD") {
        setResolvedBranch(response.branchName);
      }

      setCommitSuccess({
        commitSha: response.gitActions?.commitSha,
        commitMessage:
          response.gitActions?.commitMessage ??
          (skipPush ? "Changes committed" : "Changes committed & pushed"),
      });
      setCommitMessage("");

      onCommitted?.();

      // Clear success after 3 seconds
      successTimeoutRef.current = setTimeout(() => {
        setCommitSuccess(null);
      }, 3000);
    } catch (err) {
      setCommitError(
        err instanceof Error ? err.message : "Failed to commit and push",
      );
    } finally {
      setIsCommitting(false);
    }
  };

  // Needs branch creation
  if (needsNewBranch) {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          {isDetachedHead
            ? "Detached HEAD — create a branch first."
            : "On base branch — create a new branch first."}
        </div>
        <Button
          size="sm"
          className="w-full text-xs"
          onClick={() => void handleCreateBranch()}
          disabled={isAgentWorking || isCreatingBranch || !hasSandbox}
        >
          {isCreatingBranch ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Creating branch...
            </>
          ) : (
            <>
              <GitBranch className="mr-1.5 h-3.5 w-3.5" />
              Create branch
            </>
          )}
        </Button>
        {isAgentWorking && (
          <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
            Wait for the agent to finish before creating a branch.
          </div>
        )}
        {commitError && (
          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {commitError}
          </div>
        )}
      </div>
    );
  }

  const commitDisabled =
    isAgentWorking || isCommitting || !hasSandbox || !hasPendingGitWork;

  // Commit form
  const commitForm = (
    <div className="space-y-2">
      {isExpanded && (
        <div className="relative">
          <Textarea
            placeholder="Commit message"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            disabled={isAgentWorking || isCommitting || !hasPendingGitWork}
            rows={2}
            className="resize-none pb-7 text-xs"
          />
          <button
            type="button"
            className="absolute bottom-1.5 left-1.5 rounded p-1 text-muted-foreground/40 transition-colors hover:bg-muted/50 hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50"
            onClick={() => void handleGenerateMessage()}
            disabled={isGeneratingMessage || !hasPendingGitWork}
          >
            {isGeneratingMessage ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <WandSparkles className="h-3 w-3" />
            )}
          </button>
        </div>
      )}
      {commitSuccess ? (
        <div className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-green-500/30 bg-green-500/10 text-xs font-medium text-green-700 dark:text-green-300">
          <Check className="h-3.5 w-3.5" />
          Committed
        </div>
      ) : (
        <>
          <div className="flex w-full">
            <Button
              size="sm"
              className="min-w-0 flex-1 rounded-r-none text-xs"
              onClick={() => void handleCommit()}
              disabled={commitDisabled}
            >
              {isCommitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Committing...
                </>
              ) : (
                <>
                  {isExpanded ? (
                    <GitCommit className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Commit & Push
                </>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8 rounded-l-none border-l border-l-primary-foreground/25"
                  disabled={commitDisabled}
                  aria-label="Commit options"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem]">
                <DropdownMenuItem
                  onSelect={() => void handleCommit(true)}
                  className="gap-2 text-xs"
                >
                  Commit only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {!isExpanded && (
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              onClick={handleExpandCommit}
              disabled={!hasPendingGitWork}
            >
              Edit message
            </button>
          )}
        </>
      )}
      {commitError && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {commitError}
        </div>
      )}
    </div>
  );

  const disabledTooltip = isAgentWorking
    ? "Wait for the agent to finish"
    : !hasSandbox
      ? "Waiting for sandbox to start"
      : null;

  if (disabledTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{commitForm}</div>
        </TooltipTrigger>
        <TooltipContent side="bottom">{disabledTooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return commitForm;
}

/* ------------------------------------------------------------------ */
/* Main GitPanel component                                             */
/* ------------------------------------------------------------------ */

export function GitPanel(props: GitPanelProps) {
  const {
    gitPanelOpen,
    gitPanelTab,
    setGitPanelTab,
    diffScope,
    setDiffScope,
    openFileTab,
  } = useGitPanel();

  const {
    session,
    hasRepo,
    hasExistingPr,
    prDeploymentUrl,
    buildingDeploymentUrl,
    failedDeploymentUrl,
    isDeploymentStale,
    isDeploymentFailed,
    hasUncommittedGitChanges,
    hasDiff,
    diffFiles,
    diffSummary,
    diffRefreshing,
    refreshDiff,
    hasSandbox,
    gitStatus,
    gitStatusLoading,
    refreshGitStatus,
    onCommitted,
    isAgentWorking,
  } = props;
  const { refreshFiles } = useSessionChatWorkspaceContext();
  const baseBranch = "main";
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<{
    filePath: string;
    oldPath?: string;
  } | null>(null);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const [isDiscardingChanges, setIsDiscardingChanges] = useState(false);

  const handleDiscardChanges = useCallback(async () => {
    setIsDiscardingChanges(true);
    setDiscardError(null);

    try {
      await discardSessionUncommittedChanges({
        sessionId: session.id,
        ...(discardTarget ? { filePath: discardTarget.filePath } : {}),
        ...(discardTarget?.oldPath ? { oldPath: discardTarget.oldPath } : {}),
      });
    } catch (error) {
      setDiscardError(
        error instanceof Error
          ? error.message
          : "Failed to discard uncommitted changes",
      );
      setIsDiscardingChanges(false);
      return;
    }

    await Promise.allSettled([
      refreshDiff(),
      refreshGitStatus(),
      refreshFiles(),
    ]);
    setDiscardDialogOpen(false);
    setDiscardTarget(null);
    setIsDiscardingChanges(false);
  }, [discardTarget, refreshDiff, refreshFiles, refreshGitStatus, session.id]);

  const { files: sessionFiles, isLoading: filesLoading } = useSessionFiles(
    session.id,
    hasSandbox,
  );

  const hasDiffChanges =
    diffSummary &&
    (diffSummary.totalAdditions > 0 || diffSummary.totalDeletions > 0);
  const hasUnstagedChanges =
    (gitStatus?.unstagedCount ?? 0) > 0 ||
    Boolean(diffFiles?.some(isUncommittedFile));
  const showPreviewButton =
    Boolean(prDeploymentUrl) || isDeploymentStale || isDeploymentFailed;
  const previewTargetUrl = isDeploymentStale
    ? buildingDeploymentUrl
    : (prDeploymentUrl ?? (isDeploymentFailed ? failedDeploymentUrl : null));

  const canOpenPrTab =
    hasExistingPr ||
    (hasRepo && gitStatus !== null && hasDiff && !hasUncommittedGitChanges);
  const prTabDisabledReason = canOpenPrTab
    ? null
    : !hasRepo
      ? "Create a repo first"
      : gitStatus === null
        ? "Loading git status..."
        : hasUncommittedGitChanges
          ? "Commit your changes before creating a pull request."
          : "Commit changes to your branch before creating a pull request.";
  const isRefreshingChanges = diffRefreshing || gitStatusLoading;
  const diffScopeManuallySetRef = useRef(false);

  useEffect(() => {
    if (!gitPanelOpen) {
      diffScopeManuallySetRef.current = false;
      return;
    }

    if (!diffScopeManuallySetRef.current) {
      setDiffScope(hasUnstagedChanges ? "uncommitted" : "branch");
    }
  }, [gitPanelOpen, hasUnstagedChanges, setDiffScope]);

  useEffect(() => {
    if (gitPanelTab === "pr" && prTabDisabledReason) {
      setGitPanelTab("diff");
    }
  }, [gitPanelTab, prTabDisabledReason, setGitPanelTab]);

  const discardTitle = discardTarget
    ? "Discard file changes?"
    : "Discard uncommitted changes?";
  const discardDescription = discardTarget
    ? `This permanently removes local changes for ${discardTarget.filePath}. Committed changes stay intact.`
    : "This permanently removes local uncommitted changes from the sandbox. Committed changes stay intact.";
  const discardingFilePath = discardTarget?.filePath ?? null;
  const gitPanelTabs = [
    "files" as const,
    "diff" as const,
    ...(canOpenPrTab ? (["pr"] as const) : []),
  ];

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Panel top bar: PR link or branch name — matches session header height */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {showPreviewButton && previewTargetUrl && (
            /* oxlint-disable-next-line nextjs/no-html-link-for-pages */
            <a
              href={previewTargetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Globe
                className={cn(
                  "h-3.5 w-3.5",
                  isDeploymentFailed && "text-red-500",
                  !isDeploymentFailed && !isDeploymentStale && "text-green-500",
                  !isDeploymentFailed &&
                    isDeploymentStale &&
                    "text-amber-500 animate-pulse",
                )}
              />
              Preview
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          )}
        </div>
      </div>

      {/* Tab bar — matches chat tabs sub-header height */}
      <div className="flex items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-[7px]">
        {gitPanelTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setGitPanelTab(tab)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              gitPanelTab === tab
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            {tab === "files" ? "Files" : tab === "diff" ? "Changes" : "PR"}
            {tab === "diff" && hasDiffChanges && (
              <span className="ml-1 text-[10px] text-muted-foreground font-mono">
                {diffFiles?.length ?? 0}
              </span>
            )}
          </button>
        ))}
        {!canOpenPrTab && prTabDisabledReason && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-disabled="true"
                className="cursor-not-allowed rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground opacity-50"
              >
                PR
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{prTabDisabledReason}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Panel content */}
      <div
        className={cn(
          "min-h-0 flex-1",
          gitPanelTab === "diff" || gitPanelTab === "files"
            ? "flex flex-col"
            : "overflow-y-auto",
        )}
      >
        {gitPanelTab === "files" && (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {filesLoading ? (
              <div className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/25 py-8 text-center">
                <p className="text-xs text-muted-foreground">Loading files…</p>
              </div>
            ) : sessionFiles && sessionFiles.length > 0 ? (
              <FileTree
                files={sessionFiles}
                onFileClick={(filePath) => openFileTab(filePath)}
              />
            ) : (
              <div className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/25 py-8 text-center">
                <p className="text-xs text-muted-foreground">
                  {!hasSandbox ? "Waiting for sandbox…" : "No files found"}
                </p>
              </div>
            )}
          </div>
        )}

        {gitPanelTab === "diff" && (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Fixed commit area */}
            <div className="shrink-0 p-3 pb-0">
              {hasRepo && (
                <div className="mb-2">
                  <InlineCommitPanel
                    session={session}
                    hasSandbox={hasSandbox}
                    gitStatus={gitStatus}
                    refreshGitStatus={refreshGitStatus}
                    onCommitted={onCommitted}
                    isAgentWorking={isAgentWorking}
                    baseBranch={baseBranch}
                  />
                </div>
              )}

              {/* Separator */}
              {hasRepo && diffFiles && diffFiles.length > 0 && (
                <div className="mb-2 border-t border-border" />
              )}

              {/* Scope toggle */}
              {diffFiles && diffFiles.length > 0 && (
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        diffScopeManuallySetRef.current = true;
                        setDiffScope("branch");
                      }}
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                        diffScope === "branch"
                          ? "bg-secondary text-secondary-foreground"
                          : "text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      All Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        diffScopeManuallySetRef.current = true;
                        setDiffScope("uncommitted");
                      }}
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                        diffScope === "uncommitted"
                          ? "bg-secondary text-secondary-foreground"
                          : "text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      Uncommitted
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasUncommittedGitChanges ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDiscardTarget(null);
                          setDiscardError(null);
                          setDiscardDialogOpen(true);
                        }}
                        disabled={
                          !hasSandbox || isDiscardingChanges || isAgentWorking
                        }
                        className="h-6 w-6 shrink-0 px-0 text-muted-foreground hover:text-destructive"
                        title="Discard uncommitted changes"
                        aria-label="Discard uncommitted changes"
                      >
                        {isDiscardingChanges ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void Promise.all([
                          refreshDiff(),
                          refreshGitStatus(),
                          refreshFiles(),
                        ]);
                      }}
                      disabled={!hasSandbox || isRefreshingChanges}
                      className="h-6 w-6 shrink-0 px-0"
                      title="Refresh changes"
                      aria-label="Refresh changes"
                    >
                      <RefreshCw
                        className={cn(
                          "h-3.5 w-3.5",
                          isRefreshingChanges && "animate-spin",
                        )}
                      />
                    </Button>
                  </div>
                </div>
              )}

              {/* File summary */}
              {diffFiles &&
                diffFiles.length > 0 &&
                hasDiffChanges &&
                (() => {
                  const visibleFiles =
                    diffScope === "branch"
                      ? diffFiles
                      : diffFiles.filter(isUncommittedFile);
                  const adds = visibleFiles.reduce(
                    (sum, f) => sum + f.additions,
                    0,
                  );
                  const dels = visibleFiles.reduce(
                    (sum, f) => sum + f.deletions,
                    0,
                  );
                  return (
                    <div className="mb-2 flex items-center justify-between gap-2 px-2">
                      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {visibleFiles.length} file
                          {visibleFiles.length !== 1 ? "s" : ""} changed
                        </span>
                        {adds > 0 && (
                          <span className="text-green-600 dark:text-green-500">
                            +{adds}
                          </span>
                        )}
                        {dels > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            -{dels}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </div>

            {/* Scrollable file list */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {diffFiles && diffFiles.length > 0 ? (
                <DiffFileList
                  files={diffFiles}
                  onDiscardFile={(file) => {
                    setDiscardTarget({
                      filePath: file.path,
                      ...(file.oldPath ? { oldPath: file.oldPath } : {}),
                    });
                    setDiscardError(null);
                    setDiscardDialogOpen(true);
                  }}
                  discardingFilePath={
                    isDiscardingChanges && discardTarget
                      ? discardingFilePath
                      : null
                  }
                  discardDisabled={isDiscardingChanges || isAgentWorking}
                />
              ) : (
                <div className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/25 py-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    {!hasSandbox
                      ? "Waiting for sandbox..."
                      : diffFiles === null
                        ? "Loading..."
                        : "No file changes yet"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={discardDialogOpen}
        onOpenChange={(open) => {
          if (!isDiscardingChanges) {
            setDiscardDialogOpen(open);
          }
          if (!open) {
            setDiscardError(null);
            setDiscardTarget(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{discardTitle}</DialogTitle>
            <DialogDescription>{discardDescription}</DialogDescription>
          </DialogHeader>
          {discardError ? (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {discardError}
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isDiscardingChanges}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => void handleDiscardChanges()}
              disabled={isDiscardingChanges}
            >
              {isDiscardingChanges ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Discarding...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {discardTarget ? "Discard file" : "Discard changes"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
