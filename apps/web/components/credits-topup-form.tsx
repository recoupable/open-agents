"use client";

import { CreditsTopupAmountDisplay } from "@/components/credits-topup-amount-display";
import { CreditsTopupFeeDisclosure } from "@/components/credits-topup-fee-disclosure";
import { CreditsTopupPresetChips } from "@/components/credits-topup-preset-chips";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { useCreditsTopupDialog } from "@/hooks/use-credits-topup-dialog";

type HookValues = ReturnType<typeof useCreditsTopupDialog>;

type CreditsTopupFormProps = Omit<
  HookValues,
  "chargedSuccess" | "checkoutFallback"
> & {
  onClose: () => void;
};

export function CreditsTopupForm({
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
  onClose,
}: CreditsTopupFormProps) {
  return (
    <>
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
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleContinue()}
          disabled={submitDisabled}
        >
          {submitting ? "Working..." : "Continue"}
        </Button>
      </DialogFooter>
    </>
  );
}
