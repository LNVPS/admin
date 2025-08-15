export const BTC_SYMBOL = "₿";

/**
 * Converts base amounts into display string
 * @param amount Bitcoin amounts as mill-sats, fiat amounts as cents
 * @param currency
 * @param minDigits
 * @param maxDigits
 * @returns
 */
export const formatCurrency = (
  amount: number,
  currency: string,
  minDigits?: number,
  maxDigits?: number,
) => {
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
