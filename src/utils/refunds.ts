import type { ActivityPayment, ActivityPaymentTotal, RefundTrigger } from "../lib/api";

function isRefundPayment(paymentType: string | undefined): boolean {
  return paymentType === "refund";
}

export interface RefundCurrencyTotal {
  currency: string;
  count: number;
  amount: number;
}

interface RefundMetadata {
  refunded_payment_id?: unknown;
  by_owner_user_id?: unknown;
  recorded_by_admin_user_id?: unknown;
  reason?: unknown;
}

function refundMetadata(payment: ActivityPayment): RefundMetadata {
  const refund = payment.metadata?.refund;
  return refund && typeof refund === "object" ? (refund as RefundMetadata) : {};
}

export function refundRows(payments: ActivityPayment[]): ActivityPayment[] {
  return payments.filter((p) => isRefundPayment(p.payment_type));
}

export function refundedPaymentId(payment: ActivityPayment): string | null {
  if (payment.refunded_payment_id) return payment.refunded_payment_id;
  const id = refundMetadata(payment).refunded_payment_id;
  return typeof id === "string" ? id : null;
}

export function refundTrigger(payment: ActivityPayment): RefundTrigger {
  if (payment.refund_trigger) return payment.refund_trigger;
  const meta = refundMetadata(payment);
  if (meta.by_owner_user_id != null) return "owner_delete";
  if (meta.recorded_by_admin_user_id != null) return "admin";
  return "manual";
}

export const REFUND_TRIGGER_LABEL: Record<RefundTrigger, string> = {
  owner_delete: "Owner delete",
  admin_delete: "Admin delete",
  admin: "Admin",
  manual: "Manual",
};

export function refundReason(payment: ActivityPayment): string | null {
  const reason = refundMetadata(payment).reason;
  return typeof reason === "string" && reason !== "" ? reason : null;
}

export function refundTotals(totals: ActivityPaymentTotal[]): RefundCurrencyTotal[] {
  return totals
    .filter((t) => isRefundPayment(t.payment_type))
    .map((t) => ({ currency: t.currency, count: t.count, amount: t.amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export function refundsInCurrency(rows: ActivityPayment[], currency: string | null): ActivityPayment[] {
  return currency === null ? rows : rows.filter((r) => r.currency === currency);
}
