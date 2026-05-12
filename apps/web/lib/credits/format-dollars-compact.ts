/**
 * Compact dollar format that drops `.00` for whole-dollar amounts ($20
 * instead of $20.00). Used for preset chip labels so the row stays
 * compact and visually matches the Vercel AI Gateway design.
 */
export function formatDollarsCompact(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}
