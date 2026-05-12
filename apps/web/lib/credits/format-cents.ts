/**
 * Renders a USD amount from integer cents with the locale's standard
 * two-decimal currency format ($100.00, $20.91, $0.00).
 */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
