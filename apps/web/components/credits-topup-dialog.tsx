"use client";

import { useCallback } from "react";
import { CreditsTopupAmountDisplay } from "@/components/credits-topup-amount-display";
import { CreditsTopupFeeDisclosure } from "@/components/credits-topup-fee-disclosure";
import { CreditsTopupPresetChips } from "@/components/credits-topup-preset-chips";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreditsTopupDialog } from "@/hooks/use-credits-topup-dialog";

type CreditsTopupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreditsTopupDialog({
  open,
  onOpenChange,
}: CreditsTopupDialogProps) {
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const {
    selection,
    setSelection,
    customDollars,
    setCustomDollars,
    submitting,
    submitError,
    charge,
    customCreditsBelowMin,
    submitDisabled,
    handleContinue,
  } = useCreditsTopupDialog({ onClose: handleClose });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy Recoup Credits</DialogTitle>
          <DialogDescription>
            Purchase credits as a one-time top-up to power your Recoup agents.
            Credits don&apos;t expire and stack on top of your monthly plan
            allotment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <CreditsTopupAmountDisplay
            selection={selection}
            customDollars={customDollars}
            onCustomChange={setCustomDollars}
            creditsCents={charge.credits}
          />
          <CreditsTopupPresetChips
            selection={selection}
            onSelect={setSelection}
          />
          <CreditsTopupFeeDisclosure
            charge={charge}
            customCreditsBelowMin={customCreditsBelowMin}
          />
          {submitError ? (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleContinue()}
            disabled={submitDisabled}
          >
            {submitting ? "Opening checkout..." : "Continue to Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
