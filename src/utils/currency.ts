export const BTC_SYMBOL = "₿";

/**
 * List of supported currencies for dropdowns
 */
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "CHF", "AUD", "JPY", "BTC"] as const;
export type Currency = (typeof CURRENCIES)[number];

/**
 * Converts base amounts into display string
 * @param amount Bitcoin amounts as mill-sats, fiat amounts as cents
 * @param currency
 * @param minDigits
 * @param maxDigits
 * @returns
 */
export const formatCurrency = (amount: number, currency: string, minDigits?: number, maxDigits?: number) => {
  if (currency === "BTC") {
    const formattedAmount = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: minDigits ?? 0,
      maximumFractionDigits: maxDigits ?? 3,
    }).format(amount / 1000);
    return `${formattedAmount} sats`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: minDigits ?? 2,
    maximumFractionDigits: maxDigits ?? 2,
  }).format(amount / 100);
};

/**
 * Parses a string input to an unsigned 64-bit integer.
 * Used for converting form inputs to API values representing smallest currency units
 * (e.g., cents for fiat, millisats for BTC).
 *
 * @param value - String value to parse
 * @returns The parsed integer, or null if empty/invalid
 */
export function parseU64(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

/**
 * Parses a string input to a float value.
 * Used for converting form inputs to API values representing rates/percentages.
 *
 * @param value - String value to parse
 * @returns The parsed float, or null if empty/invalid
 */
export function parseRate(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === "") {
    return null;
  }
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

/**
 * Formats a decimal currency amount (already in human-readable units).
 * Unlike formatCurrency which expects base units (cents/millisats),
 * this function formats the amount as-is.
 *
 * @param amount - The decimal amount (e.g., 0.20 for €0.20, 0.00001 for BTC)
 * @param currency - The currency code
 * @returns Formatted currency string
 */
export function formatDecimalCurrency(amount: number, currency: string): string {
  if (currency === "BTC") {
    // For BTC, show the raw decimal value with appropriate precision
    const formattedAmount = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    }).format(amount);
    return `${formattedAmount} BTC`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}

/**
 * Converts a human-readable amount to smallest currency units for API submission.
 * Fiat: dollars/euros -> cents (multiply by 100)
 * BTC: sats -> millisats (multiply by 1000)
 *
 * @param amount - Human-readable amount (e.g., 10.99 for $10.99, or 5000 for 5000 sats)
 * @param currency - The currency code
 * @returns Amount in smallest units (cents/millisats)
 */
export function toSmallestUnits(amount: number, currency: string): number {
  if (currency === "BTC") {
    // User enters sats, API expects millisats
    return Math.round(amount * 1000);
  }
  // User enters dollars/euros, API expects cents
  return Math.round(amount * 100);
}

/**
 * Converts smallest currency units to human-readable amount for form display.
 * Fiat: cents -> dollars/euros (divide by 100)
 * BTC: millisats -> sats (divide by 1000)
 *
 * @param amount - Amount in smallest units (cents/millisats)
 * @param currency - The currency code
 * @returns Human-readable amount (e.g., 10.99 for $10.99, or 5000 for 5000 sats)
 */
export function fromSmallestUnits(amount: number, currency: string): number {
  if (currency === "BTC") {
    // API returns millisats, display as sats
    return amount / 1000;
  }
  // API returns cents, display as dollars/euros
  return amount / 100;
}
