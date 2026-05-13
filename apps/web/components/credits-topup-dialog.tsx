"use client";

import { useCallback } from "react";
import { CreditsTopupForm } from "@/components/credits-topup-form";
import { CreditsTopupSuccessView } from "@/components/credits-topup-success-view";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const { chargedSuccess, ...form } = useCreditsTopupDialog({
    onClose: handleClose,
  });

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
        {chargedSuccess ? (
          <CreditsTopupSuccessView
            charged={chargedSuccess}
            onClose={handleClose}
          />
        ) : (
          <CreditsTopupForm {...form} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
