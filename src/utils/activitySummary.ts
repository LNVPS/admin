import type { ActivityPaymentTotal, ActivityRefund, ActivityReport, CurrencySummary } from "../lib/api";

export const CREDIT_REFUND_LABEL = "refunded to credit";
export const CASH_REFUND_LABEL = "refunded in cash";

const FALLBACK_NOTE =
  "Refunds may reverse payments from before this window, so they are shown separately and not netted. The cash versus credit split needs the newer API.";

function fallbackSummaries(totals: ActivityPaymentTotal[]): CurrencySummary[] {
  const byCurrency = new Map<string, CurrencySummary>();
  for (const t of totals) {
    const entry = byCurrency.get(t.currency) ?? {
      currency: t.currency,
      revenue_count: 0,
      revenue: 0,
      cash_refund_count: 0,
      cash_refunds: 0,
      credit_refund_count: 0,
      credit_refunds: 0,
      refunds_of_earlier_payments: 0,
      net: null,
      net_note: null,
    };
    if (t.payment_type === "refund") {
      entry.unclassified_refund_count = (entry.unclassified_refund_count ?? 0) + t.count;
      entry.unclassified_refunds = (entry.unclassified_refunds ?? 0) + t.amount;
    } else {
      entry.revenue_count += t.count;
      entry.revenue += t.amount;
    }
    byCurrency.set(t.currency, entry);
  }
  for (const entry of byCurrency.values()) {
    if ((entry.unclassified_refund_count ?? 0) > 0) {
      entry.net_note = FALLBACK_NOTE;
    } else {
      entry.net = entry.revenue;
    }
  }
  return [...byCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export function currencySummaries(
  report: Pick<ActivityReport, "payment_totals" | "currency_summaries">,
): CurrencySummary[] {
  if (report.currency_summaries) {
    return [...report.currency_summaries].sort((a, b) => a.currency.localeCompare(b.currency));
  }
  return fallbackSummaries(report.payment_totals);
}

export function refundDestinationLabel(refund: Pick<ActivityRefund, "destination"> | undefined): string | null {
  if (!refund) return null;
  return refund.destination === "credit" ? CREDIT_REFUND_LABEL : CASH_REFUND_LABEL;
}

export function refundCount(s: CurrencySummary): number {
  return s.cash_refund_count + s.credit_refund_count + (s.unclassified_refund_count ?? 0);
}

export function refundsById(refunds: ActivityRefund[] | undefined): Map<string, ActivityRefund> {
  return new Map((refunds ?? []).map((r) => [r.id, r]));
}
