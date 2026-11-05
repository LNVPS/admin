import { describe, expect, it } from "vitest";
import type { ActivityPayment, SubscriptionPaymentType } from "../lib/api";
import { refundedPaymentId, refundRows, refundsInCurrency, refundTotals, refundTrigger } from "./refunds";

function payment(overrides: Partial<ActivityPayment>): ActivityPayment {
  return {
    id: "aa",
    payment_type: "refund" as SubscriptionPaymentType,
    currency: "EUR",
    amount: 100,
    metadata: null,
    ...overrides,
  } as ActivityPayment;
}

describe("refunds", () => {
  it("keeps only refund rows", () => {
    const rows = refundRows([
      payment({ id: "1" }),
      payment({ id: "2", payment_type: "renewal" as SubscriptionPaymentType }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["1"]);
  });

  it("reads the original payment from metadata when the field is absent", () => {
    const p = payment({ metadata: { refund: { refunded_payment_id: "orig" } } });
    expect(refundedPaymentId(p)).toBe("orig");
    expect(refundedPaymentId(payment({ refunded_payment_id: "direct" }))).toBe("direct");
    expect(refundedPaymentId(payment({}))).toBeNull();
  });

  it("derives the trigger from refund metadata", () => {
    expect(
      refundTrigger(payment({ metadata: { refund: { by_owner_user_id: 3, recorded_by_admin_user_id: null } } })),
    ).toBe("owner_delete");
    expect(refundTrigger(payment({ metadata: { refund: { recorded_by_admin_user_id: 7 } } }))).toBe("admin");
    expect(refundTrigger(payment({}))).toBe("manual");
    expect(refundTrigger(payment({ refund_trigger: "admin_delete" }))).toBe("admin_delete");
  });

  it("totals refunds per currency", () => {
    const totals = refundTotals([
      { currency: "EUR", payment_type: "refund" as SubscriptionPaymentType, count: 2, amount: 16150, tax: 0 },
      { currency: "BTC", payment_type: "refund" as SubscriptionPaymentType, count: 1, amount: 75386859, tax: 0 },
      { currency: "EUR", payment_type: "renewal" as SubscriptionPaymentType, count: 9, amount: 99999, tax: 0 },
    ]);
    expect(totals).toEqual([
      { currency: "BTC", count: 1, amount: 75386859 },
      { currency: "EUR", count: 2, amount: 16150 },
    ]);
  });

  it("drills down to the rows of one currency", () => {
    const rows = [payment({ id: "1" }), payment({ id: "2", currency: "BTC" })];
    expect(refundsInCurrency(rows, "BTC").map((r) => r.id)).toEqual(["2"]);
    expect(refundsInCurrency(rows, null)).toHaveLength(2);
  });
});
