"use client";

import { Info } from "lucide-react";
import type { TopupCharge } from "@/lib/credits/compute-topup-charge";
import { formatCents } from "@/lib/credits/format-cents";
import { TOPUP_CUSTOM_MIN_DOLLARS } from "@/lib/credits/topup-presets";

type CreditsTopupFeeDisclosureProps = {
  charge: TopupCharge;
  customCreditsBelowMin: boolean;
};

export function CreditsTopupFeeDisclosure({
  charge,
  customCreditsBelowMin,
}: CreditsTopupFeeDisclosureProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        {customCreditsBelowMin ? (
          <span>
            Minimum top-up is {formatCents(TOPUP_CUSTOM_MIN_DOLLARS * 100)}.
          </span>
        ) : charge.credits > 0 ? (
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
  );
}
