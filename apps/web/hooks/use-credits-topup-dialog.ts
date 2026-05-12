"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useMemo, useState } from "react";
import { computeTopupCharge } from "@/lib/credits/compute-topup-charge";
import {
  TOPUP_CUSTOM_MIN_DOLLARS,
  TOPUP_DEFAULT_CREDITS,
} from "@/lib/credits/topup-presets";
import { createClientCreditsSession } from "@/lib/stripe/create-client-credits-session";

export type TopupSelection =
  | { kind: "preset"; credits: number }
  | { kind: "custom" };

const CUSTOM_DOLLARS_PATTERN = /^\d{1,5}(\.\d{0,2})?$/;

type UseCreditsTopupDialogParams = { onClose: () => void };

export function useCreditsTopupDialog({
  onClose,
}: UseCreditsTopupDialogParams) {
  const { getAccessToken } = usePrivy();
  const [selection, setSelection] = useState<TopupSelection>({
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
    try {
      const token = await getAccessToken();
      if (!token) {
        setSubmitError("You need to sign in before topping up credits.");
        return;
      }
      const result = await createClientCreditsSession(token, credits);
      if (result?.error) {
        setSubmitError("Couldn't create a checkout session. Please try again.");
        return;
      }
      onClose();
    } catch {
      setSubmitError("Couldn't create a checkout session. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [credits, getAccessToken, onClose]);

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
  };
}
