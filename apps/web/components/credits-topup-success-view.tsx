"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { formatCents } from "@/lib/credits/format-cents";
import type { ChargedSuccess } from "@/hooks/use-credits-topup-dialog";

type CreditsTopupSuccessViewProps = {
  charged: ChargedSuccess;
  onClose: () => void;
};

export function CreditsTopupSuccessView({
  charged,
  onClose,
}: CreditsTopupSuccessViewProps) {
  return (
    <>
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="size-12 text-foreground" aria-hidden />
        <div className="text-2xl font-semibold tracking-tight">
          Credits added
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          We charged your card on file{" "}
          <span className="font-medium text-foreground">
            {formatCents(charged.totalCents)}
          </span>{" "}
          for{" "}
          <span className="font-medium text-foreground">
            {formatCents(charged.creditsPurchased)}
          </span>{" "}
          of credits. They&apos;ll appear in your balance within a few seconds.
        </p>
      </div>
      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}
