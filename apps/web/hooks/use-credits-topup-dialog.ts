"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { computeTopupCharge } from "@/lib/credits/compute-topup-charge";
import {
  TOPUP_CUSTOM_MIN_DOLLARS,
  TOPUP_DEFAULT_CREDITS,
} from "@/lib/credits/topup-presets";
import { createClientCreditsSession } from "@/lib/stripe/create-client-credits-session";
import type { CreditsTopupDeclineReason } from "@/lib/stripe/parse-credits-topup-response";

export type TopupSelection =
  | { kind: "preset"; credits: number }
  | { kind: "custom" };

export type ChargedSuccess = {
  paymentIntentId: string;
  creditsPurchased: number;
  totalCents: number;
};

export type CheckoutFallback = {
  url: string;
  declineReason: CreditsTopupDeclineReason;
};

const CUSTOM_DOLLARS_PATTERN = /^\d{1,5}(\.\d{0,2})?$/;
const isCreditsKey = (key: unknown) =>
  Array.isArray(key) && key[0] === "account-credits";

type UseCreditsTopupDialogParams = { onClose: () => void };

export function useCreditsTopupDialog({
  onClose,
}: UseCreditsTopupDialogParams) {
  const { getAccessToken } = usePrivy();
  const { mutate } = useSWRConfig();
  const [selection, setSelection] = useState<TopupSelection>({
    kind: "preset",
    credits: TOPUP_DEFAULT_CREDITS,
  });
  const [customDollars, setCustomDollars] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [chargedSuccess, setChargedSuccess] = useState<ChargedSuccess | null>(
    null,
  );
  const [checkoutFallback, setCheckoutFallback] =
    useState<CheckoutFallback | null>(null);

  const credits = useMemo(() => {
    if (selection.kind === "preset") return selection.credits;
    if (!CUSTOM_DOLLARS_PATTERN.test(customDollars)) return 0;
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
    setCheckoutFallback(null);
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setSubmitError("You need to sign in before topping up credits.");
        return;
      }
      const result = await createClientCreditsSession(token, credits);
      if (!result.ok) {
        setSubmitError("Couldn't create a checkout session. Please try again.");
        return;
      }
      if (result.response.kind === "checkout") {
        // Stripe declined the saved card: surface the reason and let the
        // user decide whether to update their payment method.
        if (result.response.declineReason) {
          setCheckoutFallback({
            url: result.response.url,
            declineReason: result.response.declineReason,
          });
          return;
        }
        // No card on file → open Checkout immediately to collect one.
        window.open(result.response.url, "_blank", "noopener,noreferrer");
        onClose();
        return;
      }
      setChargedSuccess(result.response);
      void mutate(isCreditsKey);
    } catch {
      setSubmitError("Couldn't create a checkout session. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [credits, getAccessToken, onClose, mutate]);

  return {
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
    chargedSuccess,
    checkoutFallback,
  };
}
