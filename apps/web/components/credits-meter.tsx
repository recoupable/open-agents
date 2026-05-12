"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAccountCredits } from "@/hooks/use-account-credits";

export function CreditsMeter() {
  const { credits, isLoading, error } = useAccountCredits();

  if (isLoading) {
    return <Skeleton className="h-14 w-full rounded-lg" />;
  }

  if (error || !credits) {
    return null;
  }

  const { remaining_credits, total_credits } = credits;
  const pct = total_credits > 0 ? (remaining_credits / total_credits) * 100 : 0;
  const clampedPct = Math.max(0, Math.min(100, pct));

  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 px-4 py-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Credits</span>
        <span className="font-mono font-semibold tabular-nums">
          {remaining_credits.toLocaleString()} /{" "}
          {total_credits.toLocaleString()}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Remaining credits"
        aria-valuenow={remaining_credits}
        aria-valuemin={0}
        aria-valuemax={total_credits}
      >
        <div
          className="h-full bg-foreground transition-[width]"
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  );
}
