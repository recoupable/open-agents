"use client";

import { CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavedPaymentMethod } from "@/hooks/use-saved-payment-method";

/**
 * Returns true when `exp_year` / `exp_month` indicate the card has already
 * expired. A card with exp_month: 12, exp_year: 2026 is valid through
 * Dec 31 2026 — `new Date(2026, 12)` resolves to Jan 1 2027 at 00:00 (JS
 * months are 0-indexed), so the comparison `<=` now is correct.
 */
function isCardExpired(expMonth: number, expYear: number): boolean {
  return new Date(expYear, expMonth) <= new Date();
}

function formatBrand(brand: string): string {
  // Capitalize known brand names; leave unknowns as-is. Stripe returns
  // lowercase strings like "visa", "mastercard", "amex".
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

/**
 * Pre-charge confirmation row for the credits top-up dialog. Renders the
 * default Stripe card on file so the customer can see which card will be
 * charged before clicking Continue. Branches:
 *
 *  - Loading      → skeleton row
 *  - No card      → "No payment method on file — a checkout session will collect one"
 *  - Valid card   → "Visa •••• 4242 · exp 12/2026"
 *  - Expired card → red badge + "Expired — a checkout session will be used"
 */
export function CreditsTopupPaymentMethod() {
  const { paymentMethod, isLoading } = useSavedPaymentMethod();

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
        <CreditCard className="size-4 text-muted-foreground" aria-hidden />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  const card = paymentMethod?.card ?? null;

  if (!card) {
    return (
      <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <CreditCard className="size-4" aria-hidden />
        <span>
          No payment method on file — a secure checkout will collect one.
        </span>
      </div>
    );
  }

  const expired = isCardExpired(card.exp_month, card.exp_year);
  const expLabel = `${String(card.exp_month).padStart(2, "0")}/${card.exp_year}`;

  if (expired) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
        <CreditCard className="size-4 text-destructive" aria-hidden />
        <div className="flex flex-1 flex-wrap items-center gap-x-2">
          <span className="font-medium text-foreground">
            {formatBrand(card.brand)} •••• {card.last4}
          </span>
          <span className="text-destructive">
            Expired {expLabel} — a checkout session will be used.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <CreditCard className="size-4 text-muted-foreground" aria-hidden />
      <span className="font-medium text-foreground">
        {formatBrand(card.brand)} •••• {card.last4}
      </span>
      <span className="text-muted-foreground">· exp {expLabel}</span>
    </div>
  );
}
