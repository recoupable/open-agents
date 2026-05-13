"use client";

import {
  ChevronDown,
  ChevronRight,
  Check,
  Circle,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { isArtistWorkflowSuccessPayload } from "@/lib/artist-workflow/api-types";
import { FetchError, fetcher } from "@/lib/swr";
import { cn } from "@/lib/utils";

const POLL_MS = 8_000;

export type ArtistWorkflowStatusPanelProps = {
  sessionId: string;
  isSandboxActive: boolean;
  /** When true, poll a bit faster right after the agent may have edited RECOUP.md */
  chatJustFinished?: boolean;
};

function firstActiveStepIndex(steps: { done: boolean }[]): number | null {
  for (let i = 0; i < steps.length; i += 1) {
    if (!steps[i]?.done) return i;
  }
  return null;
}

export function ArtistWorkflowStatusPanel({
  sessionId,
  isSandboxActive,
  chatJustFinished = false,
}: ArtistWorkflowStatusPanelProps) {
  const [minimized, setMinimized] = useState(false);

  const swrKey = isSandboxActive
    ? `/api/sessions/${sessionId}/artist-workflow`
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher<unknown>, {
    refreshInterval: isSandboxActive ? (chatJustFinished ? 3_000 : POLL_MS) : 0,
    revalidateOnFocus: true,
    dedupingInterval: 2_000,
  });

  const payload = useMemo(() => {
    if (!data || !isArtistWorkflowSuccessPayload(data)) {
      return null;
    }
    return data;
  }, [data]);

  const summary = useMemo(() => {
    if (!payload || payload.artists.length === 0) return null;
    let completed = 0;
    let total = 0;
    for (const a of payload.artists) {
      completed += a.completedCount;
      total += a.totalSteps;
    }
    return { completed, total };
  }, [payload]);

  if (!isSandboxActive) {
    return null;
  }

  const errorMessage =
    error instanceof FetchError
      ? error.message
      : error instanceof Error
        ? error.message
        : error
          ? "Could not load artist workflow"
          : null;

  return (
    <div
      className="mx-4 overflow-hidden rounded-t-xl border border-b-0 border-border/60 bg-card transition-all"
      role="region"
      aria-label="Artist setup progress from RECOUP.md checklists"
    >
      <button
        type="button"
        onClick={() => setMinimized((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted-foreground/5"
      >
        {minimized ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        )}
        <span className="shrink-0 text-xs font-semibold text-muted-foreground/70">
          Artist setup
        </span>
        {summary && (
          <span className="text-xs text-muted-foreground/60">
            {summary.completed}/{summary.total}
          </span>
        )}
        {isLoading && !payload && !errorMessage && (
          <Loader2
            className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground/50"
            aria-hidden
          />
        )}
        {minimized && payload && payload.artists[0] && (
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground/50">
            {payload.artists[0].displayTitle ?? payload.artists[0].slug}
          </span>
        )}
      </button>

      {!minimized && (
        <div className="max-h-56 space-y-3 overflow-y-auto border-t border-border/40 px-3 py-2">
          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}

          {!errorMessage && isLoading && !payload && (
            <p className="text-xs text-muted-foreground/70">
              Loading checklist…
            </p>
          )}

          {!errorMessage && payload && payload.artists.length === 0 && (
            <p className="text-xs leading-relaxed text-muted-foreground/70">
              No task checklists found in{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                artists/*/RECOUP.md
              </code>
              . Use the{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                artist-workspace
              </code>{" "}
              skill to scaffold an artist; checked items appear here
              automatically.
            </p>
          )}

          {!errorMessage &&
            payload?.artists.map((artist) => {
              const activeIdx = firstActiveStepIndex(artist.steps);
              const pct =
                artist.totalSteps > 0
                  ? Math.round(
                      (artist.completedCount / artist.totalSteps) * 100,
                    )
                  : 0;

              return (
                <div key={artist.slug} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-medium text-foreground">
                      {artist.displayTitle ?? artist.slug}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground/50">
                      {artist.completedCount}/{artist.totalSteps}
                    </span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-primary/80 transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <ul className="space-y-1.5">
                    {artist.steps.map((step, idx) => {
                      const isCurrent = activeIdx === idx;
                      return (
                        <li
                          key={`${artist.slug}-${step.index}`}
                          className="flex items-start gap-2 text-xs"
                          data-testid="workflow-step"
                        >
                          <span className="mt-0.5 shrink-0">
                            {step.done ? (
                              <Check
                                className="h-3.5 w-3.5 text-muted-foreground/60"
                                aria-label="Completed"
                              />
                            ) : isCurrent ? (
                              <Loader2
                                className="h-3.5 w-3.5 animate-spin text-primary"
                                aria-label="In progress"
                              />
                            ) : (
                              <Circle
                                className="h-3.5 w-3.5 text-muted-foreground/25"
                                aria-label="Pending"
                              />
                            )}
                          </span>
                          <span
                            className={cn(
                              "leading-snug",
                              step.done
                                ? "text-muted-foreground/45 line-through"
                                : isCurrent
                                  ? "text-foreground"
                                  : "text-muted-foreground/60",
                            )}
                          >
                            {step.index}. {step.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

          {!errorMessage && payload && payload.artists.length > 0 && (
            <p className="text-[10px] text-muted-foreground/40">
              Updated from sandbox ·{" "}
              <button
                type="button"
                className="underline decoration-muted-foreground/30 hover:text-muted-foreground/70"
                onClick={() => {
                  void mutate();
                }}
              >
                Refresh
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
