"use client";

import { CreditCard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscribeClick } from "@/hooks/use-subscribe-click";

export function SubscriptionButton() {
  const { handleClick, isPro, isLoading } = useSubscribeClick();

  if (isLoading) {
    return <Skeleton className="h-8 w-28 rounded-md" />;
  }

  if (isPro) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
          <Sparkles className="size-3" />
          Pro
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className="gap-1.5"
        >
          <CreditCard className="size-3.5" />
          Manage billing
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" onClick={handleClick} className="gap-1.5">
      <Sparkles className="size-3.5" />
      Subscribe
    </Button>
  );
}
