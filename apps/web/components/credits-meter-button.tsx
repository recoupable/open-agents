"use client";

import { useState } from "react";
import { CreditsMeter } from "@/components/credits-meter";
import { CreditsTopupDialog } from "@/components/credits-topup-dialog";

export function CreditsMeterButton() {
  const [topupOpen, setTopupOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setTopupOpen(true)}
        className="block w-full rounded-lg text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="View credits and top up"
      >
        <CreditsMeter />
      </button>
      <CreditsTopupDialog open={topupOpen} onOpenChange={setTopupOpen} />
    </>
  );
}
