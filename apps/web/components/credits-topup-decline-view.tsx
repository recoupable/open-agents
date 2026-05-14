"use client";

import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { CheckoutFallback } from "@/hooks/use-credits-topup-dialog";

type CreditsTopupDeclineViewProps = {
  fallback: CheckoutFallback;
  onClose: () => void;
};

export function CreditsTopupDeclineView({
  fallback,
  onClose,
}: CreditsTopupDeclineViewProps) {
  const handleUpdate = () => {
    window.open(fallback.url, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <>
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CreditCard className="size-12 text-destructive" aria-hidden />
        <div className="text-2xl font-semibold tracking-tight">
          Card declined
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          {fallback.declineReason.message}
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Update your payment method to continue. You&apos;ll be redirected to
          Stripe&apos;s secure checkout in a new tab.
        </p>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleUpdate}>
          Update payment method
        </Button>
      </DialogFooter>
    </>
  );
}
