import type { AdminAccountCredit, AdminCreditBalance } from "../lib/api";

export const BASE_CREDIT_CURRENCY = "BTC";

export function creditBalances(credit: AdminAccountCredit): AdminCreditBalance[] {
  const rows = new Map<string, number>();
  for (const b of credit.balances ?? []) {
    rows.set(b.currency, (rows.get(b.currency) ?? 0) + b.balance);
  }
  if (!rows.has(credit.currency)) rows.set(credit.currency, credit.balance);
  return [...rows.entries()]
    .map(([currency, balance]) => ({ currency, balance }))
    .sort((a, b) => {
      if (a.currency === credit.currency) return -1;
      if (b.currency === credit.currency) return 1;
      return a.currency.localeCompare(b.currency);
    });
}

export function creditUnitLabel(currency: string): string {
  return currency === BASE_CREDIT_CURRENCY ? "sats" : currency;
}

export function creditDeltaMinor(amount: number, direction: "grant" | "clawback", currency: string): number {
  const minor = Math.round(amount * (currency === BASE_CREDIT_CURRENCY ? 1000 : 100));
  return direction === "grant" ? minor : -minor;
}
