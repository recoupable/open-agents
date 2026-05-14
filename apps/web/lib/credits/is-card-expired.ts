/**
 * Returns true when the given `exp_year` / `exp_month` indicate the card has
 * already expired. Cards are valid through the end of their `exp_month` —
 * `new Date(year, month)` resolves to the first day of the month AFTER expiry
 * (JS Date months are 0-indexed, so passing the 1-indexed `exp_month` lands
 * us one month past the card's expiry), so the comparison `<= now` correctly
 * treats a card with `exp_month: 12, exp_year: 2026` as valid through
 * Dec 31 2026 23:59:59.
 *
 * `now` is injectable for deterministic testing.
 */
export function isCardExpired(
  expMonth: number,
  expYear: number,
  now: Date = new Date(),
): boolean {
  return new Date(expYear, expMonth) <= now;
}
