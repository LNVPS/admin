import { Link } from "react-router-dom";
import type { AdminPaymentDiscountInfo } from "../lib/api";
import { formatCurrency } from "../utils/currency";

interface PaymentDiscountProps {
  discount: AdminPaymentDiscountInfo;
}

/**
 * The discount applied to a payment row.
 *
 * The payment's `amount` is already net of it, so this is shown as a separate
 * note rather than folded into the totals — without it a discounted payment is
 * indistinguishable from a plain cheaper one (api#384).
 */
export function PaymentDiscount({ discount }: PaymentDiscountProps) {
  return (
    <div className="mt-1 text-xs text-emerald-400">
      <Link
        to={`/discounts/${discount.discount_id}`}
        onClick={(e) => e.stopPropagation()}
        className="font-mono hover:underline"
        title={discount.settled ? "Redemption settled" : "Not settled — the discounted invoice is still unpaid"}
      >
        {discount.code ?? `Discount #${discount.discount_id}`}
      </Link>{" "}
      <span className="font-mono">-{formatCurrency(discount.amount_off, discount.currency)}</span>
      {!discount.settled && <span className="ml-1 text-amber-400">(unsettled)</span>}
    </div>
  );
}
