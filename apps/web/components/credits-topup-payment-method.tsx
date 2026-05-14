"use client";

import { CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavedPaymentMethod } from "@/hooks/use-saved-payment-method";
import { formatBrand } from "@/lib/credits/format-brand";
import { isCardExpired } from "@/lib/credits/is-card-expired";
import { cn } from "@/lib/utils";

/**
 * Pre-charge confirmation row for the credits top-up dialog. Renders the
 * default saved card so the customer can see which card will be charged
 * before clicking Continue. Branches:
 *
 *  - Loading      → skeleton row
 *  - No card      → "No payment method on file — a secure checkout will collect one."
 *  - Valid card   → "Visa •••• 4242        exp 12/2026"
 *  - Expired card → red destructive variant + "Expired — a checkout session will be used."
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

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm",
        expired && "border-destructive/40 bg-destructive/5",
      )}
    >
      <CreditCard
        className={cn(
          "size-4 text-muted-foreground",
          expired && "text-destructive",
        )}
        aria-hidden
      />
      <span className="font-medium text-foreground">
        {formatBrand(card.brand)} •••• {card.last4}
      </span>
      <span
        className={cn(
          "ml-auto text-muted-foreground",
          expired && "text-destructive",
        )}
      >
        {expired
          ? `Expired ${expLabel} — a checkout session will be used.`
          : `exp ${expLabel}`}
      </span>
    </div>
  );
}
