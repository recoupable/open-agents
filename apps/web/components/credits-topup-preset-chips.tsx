"use client";

import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/credits/compute-topup-charge";
import { TOPUP_PRESET_CREDITS } from "@/lib/credits/topup-presets";
import type { TopupSelection } from "@/hooks/use-credits-topup-dialog";

type CreditsTopupPresetChipsProps = {
  selection: TopupSelection;
  onSelect: (selection: TopupSelection) => void;
};

export function CreditsTopupPresetChips({
  selection,
  onSelect,
}: CreditsTopupPresetChipsProps) {
  return (
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
            onClick={() => onSelect({ kind: "preset", credits: preset })}
          >
            {formatCents(preset)}
          </Button>
        );
      })}
      <Button
        type="button"
        variant={selection.kind === "custom" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect({ kind: "custom" })}
      >
        Custom
      </Button>
    </div>
  );
}
