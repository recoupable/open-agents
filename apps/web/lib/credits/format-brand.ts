/**
 * Capitalizes the first letter of a Stripe card-brand string for display.
 * Stripe returns brands lowercase (`"visa"`, `"mastercard"`, `"amex"`,
 * `"discover"`, `"jcb"`, `"unionpay"`, `"diners"`, `"unknown"`), and we want
 * "Visa" / "Mastercard" / etc. in the UI. Unknown brands pass through with
 * just their leading letter capitalized.
 */
export function formatBrand(brand: string): string {
  if (!brand) return brand;
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}
