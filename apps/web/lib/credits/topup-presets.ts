/**
 * Preset credit-purchase amounts (in cents = credits, since 1 credit = 1¢).
 * Mirrors the Vercel AI Gateway top-up dialog convention.
 */
export const TOPUP_PRESET_CREDITS = [2_000, 5_000, 10_000, 50_000] as const;

export const TOPUP_DEFAULT_CREDITS = 10_000;

/** Minimum dollars allowed in the Custom input. Keeps users above Stripe's
 * USD floor with a comfortable margin. The api intentionally has no floor
 * (planned MPP/microtransactions); the UI applies one for human-facing UX. */
export const TOPUP_CUSTOM_MIN_DOLLARS = 1;
