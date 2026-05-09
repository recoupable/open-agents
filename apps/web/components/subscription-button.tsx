"use client";

import { ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscribeClick } from "@/hooks/use-subscribe-click";

export function SubscriptionButton() {
  const { handleClick, isPro, isLoading, error } = useSubscribeClick();

  if (isLoading) {
    return <Skeleton className="h-8 w-28 rounded-md" />;
  }

  if (error) {
    return null;
  }

  if (isPro) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
          Recoupable Pro
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className="gap-1.5"
        >
          <CreditCard className="size-3.5" />
          Billing
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" onClick={handleClick} className="gap-1.5">
      Start Free Trial
      <ArrowRight className="size-3.5" />
    </Button>
  );
}
