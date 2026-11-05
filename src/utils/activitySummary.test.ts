import { describe, expect, it } from "vitest";
import type { ActivityPaymentTotal, ActivityRefund, CurrencySummary, SubscriptionPaymentType } from "../lib/api";
import {
  CASH_REFUND_LABEL,
  CREDIT_REFUND_LABEL,
  currencySummaries,
  refundDestinationLabel,
  refundsById,
} from "./activitySummary";

const total = (currency: string, type: string, count: number, amount: number): ActivityPaymentTotal => ({
  currency,
  payment_type: type as SubscriptionPaymentType,
  count,
  amount,
  tax: 0,
});

describe("currencySummaries", () => {
  it("prefers the API summaries and keeps a null net with its note", () => {
    const eur: CurrencySummary = {
      currency: "EUR",
      revenue_count: 3,
      revenue: 10795,
      cash_refund_count: 0,
      cash_refunds: 0,
      credit_refund_count: 8,
      credit_refunds: 16150,
      refunds_of_earlier_payments: 16150,
      net: null,
      net_note: "Refunds reverse payments from before this window",
    };
    const btc: CurrencySummary = {
      ...eur,
      currency: "BTC",
      revenue_count: 0,
      revenue: 0,
      credit_refund_count: 5,
      credit_refunds: 75386859,
      refunds_of_earlier_payments: 0,
    };
    const out = currencySummaries({ payment_totals: [], currency_summaries: [eur, btc] });
    expect(out.map((s) => s.currency)).toEqual(["BTC", "EUR"]);
    expect(out[1].revenue).toBe(10795);
    expect(out[1].credit_refunds).toBe(16150);
    expect(out[1].net).toBeNull();
    expect(out[1].net_note).not.toBeNull();
    expect(out[0].credit_refunds).toBe(75386859);
  });

  it("falls back to payment_totals without a bare negative net", () => {
    const out = currencySummaries({
      payment_totals: [total("EUR", "purchase", 3, 10795), total("EUR", "refund", 8, 16150)],
    });
    expect(out).toHaveLength(1);
    expect(out[0].revenue).toBe(10795);
    expect(out[0].cash_refunds).toBe(16150);
    expect(out[0].net).toBeNull();
    expect(out[0].net_note).toMatch(/before this window/);
  });

  it("fallback shows net when there are no refunds", () => {
    const out = currencySummaries({ payment_totals: [total("EUR", "renewal", 2, 800)] });
    expect(out[0].net).toBe(800);
    expect(out[0].net_note).toBeNull();
  });

  it("fallback keeps BTC refunds out of the EUR figures", () => {
    const out = currencySummaries({
      payment_totals: [total("EUR", "purchase", 3, 10795), total("BTC", "refund", 5, 75386859)],
    });
    expect(out.find((s) => s.currency === "EUR")?.net).toBe(10795);
    expect(out.find((s) => s.currency === "BTC")?.cash_refunds).toBe(75386859);
    expect(out.find((s) => s.currency === "BTC")?.net).toBeNull();
  });
});

describe("refund labels", () => {
  const refund = (id: string, destination: "cash" | "credit"): ActivityRefund => ({
    id,
    subscription_id: 1,
    user_id: 1,
    currency: "EUR",
    amount: 100,
    tax: 0,
    gross: 100,
    refunded_at: "2026-11-02T00:00:00Z",
    destination,
    credit_returned: {},
    original_payment_id: "aa",
    original_paid_at: "2026-10-06T00:00:00Z",
    original_before_window: true,
  });

  it("labels credit and cash refunds", () => {
    expect(refundDestinationLabel(refund("1", "credit"))).toBe(CREDIT_REFUND_LABEL);
    expect(refundDestinationLabel(refund("2", "cash"))).toBe(CASH_REFUND_LABEL);
    expect(CREDIT_REFUND_LABEL).toBe("refunded to credit");
    expect(CASH_REFUND_LABEL).toBe("refunded in cash");
    expect(refundDestinationLabel(undefined)).toBeNull();
  });

  it("indexes refunds by id and tolerates an older API", () => {
    expect(refundsById([refund("1", "cash")]).get("1")?.original_before_window).toBe(true);
    expect(refundsById(undefined).size).toBe(0);
  });
});
