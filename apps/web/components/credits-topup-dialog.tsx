"use client";

import { Info } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  computeTopupCharge,
  formatCents,
} from "@/lib/credits/compute-topup-charge";
import {
  TOPUP_CUSTOM_MIN_DOLLARS,
  TOPUP_DEFAULT_CREDITS,
  TOPUP_PRESET_CREDITS,
} from "@/lib/credits/topup-presets";
import { createClientCreditsSession } from "@/lib/stripe/create-client-credits-session";

type CreditsTopupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Selection = { kind: "preset"; credits: number } | { kind: "custom" };

const CUSTOM_DOLLARS_PATTERN = /^\d{1,5}(\.\d{0,2})?$/;

export function CreditsTopupDialog({
  open,
  onOpenChange,
}: CreditsTopupDialogProps) {
  const { getAccessToken } = usePrivy();
  const [selection, setSelection] = useState<Selection>({
    kind: "preset",
    credits: TOPUP_DEFAULT_CREDITS,
  });
  const [customDollars, setCustomDollars] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const credits = useMemo(() => {
    if (selection.kind === "preset") {
      return selection.credits;
    }
    if (!CUSTOM_DOLLARS_PATTERN.test(customDollars)) {
      return 0;
    }
    return Math.round(Number(customDollars) * 100);
  }, [selection, customDollars]);

  const charge = useMemo(() => computeTopupCharge(credits), [credits]);
  const customCreditsBelowMin =
    selection.kind === "custom" &&
    credits > 0 &&
    credits < TOPUP_CUSTOM_MIN_DOLLARS * 100;
  const submitDisabled = submitting || credits === 0 || customCreditsBelowMin;

  const handleContinue = useCallback(async () => {
    setSubmitError(null);
    setSubmitting(true);
    const token = await getAccessToken();
    if (!token) {
      setSubmitError("You need to sign in before topping up credits.");
      setSubmitting(false);
      return;
    }
    const result = await createClientCreditsSession(token, credits);
    if (result?.error) {
      setSubmitError("Couldn't create a checkout session. Please try again.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onOpenChange(false);
  }, [credits, getAccessToken, onOpenChange]);

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
          <div className="text-center">
            {selection.kind === "custom" ? (
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-semibold">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={customDollars}
                  onChange={(event) => setCustomDollars(event.target.value)}
                  placeholder="0.00"
                  aria-label="Custom amount in dollars"
                  className="h-auto w-32 border-0 bg-transparent p-0 text-center text-5xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
                />
              </div>
            ) : (
              <div className="text-5xl font-semibold tracking-tight tabular-nums">
                {formatCents(charge.credits)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {TOPUP_PRESET_CREDITS.map((preset) => {
              const isActive =
                selection.kind === "preset" && selection.credits === preset;
              return (
                <Button
                  key={preset}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setSelection({ kind: "preset", credits: preset })
                  }
                >
                  {formatCents(preset)}
                </Button>
              );
            })}
            <Button
              type="button"
              variant={selection.kind === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelection({ kind: "custom" })}
            >
              Custom
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              {customCreditsBelowMin ? (
                <span>
                  Minimum top-up is{" "}
                  {formatCents(TOPUP_CUSTOM_MIN_DOLLARS * 100)}.
                </span>
              ) : credits > 0 ? (
                <span>
                  You&apos;ll be charged{" "}
                  <span className="font-medium text-foreground">
                    {formatCents(charge.totalCents)}
                  </span>{" "}
                  ({formatCents(charge.credits)} credits +{" "}
                  {formatCents(charge.feeCents)} processing fee).
                </span>
              ) : (
                <span>Select a preset or enter a custom amount.</span>
              )}
            </div>
          </div>

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
            onClick={() => onOpenChange(false)}
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
