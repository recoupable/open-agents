"use client";

import { formatCents } from "@/lib/credits/format-cents";
import type { TopupSelection } from "@/hooks/use-credits-topup-dialog";

type CreditsTopupAmountDisplayProps = {
  selection: TopupSelection;
  customDollars: string;
  onCustomChange: (value: string) => void;
  creditsCents: number;
};

export function CreditsTopupAmountDisplay({
  selection,
  customDollars,
  onCustomChange,
  creditsCents,
}: CreditsTopupAmountDisplayProps) {
  if (selection.kind === "custom") {
    return (
      <div className="flex items-baseline justify-center text-center text-5xl font-semibold tracking-tight tabular-nums">
        <span>$</span>
        <input
          type="text"
          inputMode="decimal"
          value={customDollars}
          onChange={(event) => onCustomChange(event.target.value)}
          placeholder="0.00"
          aria-label="Custom amount in dollars"
          className="w-56 border-0 bg-transparent p-0 text-center text-inherit placeholder:text-muted-foreground/40 focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div className="text-center text-5xl font-semibold tracking-tight tabular-nums">
      {formatCents(creditsCents)}
    </div>
  );
}
