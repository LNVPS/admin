import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminPaymentRefundsInfo, AdminVmPaymentInfo } from "../lib/api";
import { formatCurrency } from "../utils/currency";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { MoneyAmountInput } from "./MoneyInput";

interface RecordPaymentRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  vmId: number;
  /** The payment being reversed. Must be paid and must not itself be a refund. */
  payment: AdminVmPaymentInfo | null;
  onSuccess: () => void;
}

/** `<input type="datetime-local">` value for a Date, in the browser's local zone. */
function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

/**
 * Record a refund that has **already been paid out by hand**.
 *
 * Nothing here moves money — the API has no payout implementation (it answers
 * `501`). This writes the accounting entry so P/L, the OSS VAT return and every
 * earnings figure stop counting the returned money as revenue.
 *
 * The refund is recorded against the payment it reverses rather than the VM,
 * because the row is a copy of that payment: same currency, same frozen
 * exchange rate, same VAT rate/country/treatment, with the amount pro-rated.
 */
export function RecordPaymentRefundModal({ isOpen, onClose, vmId, payment, onSuccess }: RecordPaymentRefundModalProps) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<AdminPaymentRefundsInfo | null>(null);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [refundedAt, setRefundedAt] = useState("");

  const paymentId = payment?.id;

  // Load what is still refundable whenever the modal opens: partial refunds are
  // allowed, so the ceiling is the payment minus what has already been recorded,
  // and defaulting the form to the full payment would be wrong on the second one.
  useEffect(() => {
    if (!isOpen || !paymentId) return;

    let cancelled = false;
    setError(null);
    setReason("");
    setExternalRef("");
    setRefundedAt(toLocalDateTimeValue(new Date()));
    setExisting(null);
    setAmount(0);
    setLoadingExisting(true);

    adminApi
      .getPaymentRefunds(vmId, paymentId)
      .then((info) => {
        if (cancelled) return;
        setExisting(info);
        setAmount(info.refundable_remaining);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load existing refunds");
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, paymentId, vmId, adminApi.getPaymentRefunds]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!payment || !existing) return;

    if (amount <= 0) {
      setError("Refund amount must be greater than 0");
      return;
    }
    if (amount > existing.refundable_remaining) {
      setError(
        `Refund of ${formatCurrency(amount, existing.currency)} exceeds the ${formatCurrency(
          existing.refundable_remaining,
          existing.currency,
        )} still refundable on this payment`,
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await adminApi.recordPaymentRefund(vmId, payment.id, {
        amount,
        ...(reason.trim() && { reason: reason.trim() }),
        ...(externalRef.trim() && { external_ref: externalRef.trim() }),
        // The date the refund lands in reports. Backdating into a closed VAT
        // period is deliberate — a refund belongs to the period it happened in.
        ...(refundedAt && { refunded_at: Math.floor(new Date(refundedAt).getTime() / 1000) }),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record refund");
    } finally {
      setLoading(false);
    }
  };

  if (!payment) return null;

  const currency = existing?.currency ?? payment.currency;
  const fullyRefunded = existing !== null && existing.refundable_remaining === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Refund — Payment ${payment.id.slice(0, 8)}…`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => handleSubmit()}
            isLoading={loading}
            disabled={loadingExisting || !existing || fullyRefunded || amount <= 0}
          >
            Record Refund
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-yellow-400 font-medium">This moves no money</h4>
              <p className="text-yellow-300/80 text-sm mt-1">
                Automated payout is not implemented. Issue the refund yourself (wallet, Revolut, bank) and record it
                here so earnings, P/L and the OSS VAT return stop counting it as revenue. The VM is not stopped or
                deleted.
              </p>
            </div>
          </div>
        </div>

        {loadingExisting ? (
          <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400">Loading refund history…</div>
        ) : existing ? (
          <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Originally charged</span>
              <span className="text-slate-100 font-medium">{formatCurrency(existing.amount, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Already refunded</span>
              <span className={existing.refunded_total > 0 ? "text-red-400" : "text-gray-500"}>
                {formatCurrency(existing.refunded_total, currency)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-2">
              <span className="text-gray-300">Refundable remaining</span>
              <span className="text-green-400 font-bold">
                {formatCurrency(existing.refundable_remaining, currency)}
              </span>
            </div>
            {existing.refunds.length > 0 && (
              <ul className="border-t border-gray-700 pt-2 space-y-1 font-mono text-xs text-gray-400">
                {existing.refunds.map((r) => (
                  <li key={r.id} className="flex justify-between">
                    <span title={r.id}>{new Date(r.created).toLocaleString()}</span>
                    <span className="text-red-400">-{formatCurrency(r.amount, r.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {fullyRefunded && (
          <p className="text-sm text-red-400">This payment is already fully refunded — nothing left to record.</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="refund-amount" className="block text-sm font-medium text-gray-300 mb-2">
              Amount *
            </label>
            <MoneyAmountInput
              id="refund-amount"
              value={amount}
              currency={currency}
              onChange={setAmount}
              disabled={loadingExisting || fullyRefunded}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Gross magnitude returned (net + tax), in the original payment's currency. Tax is pro-rated and rounded
              down by the API, so partial refunds can never return more VAT than was collected.
            </p>
          </div>

          <div>
            <label htmlFor="refund-external-ref" className="block text-sm font-medium text-gray-300 mb-2">
              External Reference
            </label>
            <input
              id="refund-external-ref"
              type="text"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder="Lightning preimage, Revolut refund id, bank reference…"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Proof the money actually moved. Strongly recommended.</p>
          </div>

          <div>
            <label htmlFor="refund-reason" className="block text-sm font-medium text-gray-300 mb-2">
              Reason
            </label>
            <input
              id="refund-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer requested cancellation"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="refund-date" className="block text-sm font-medium text-gray-300 mb-2">
              Refunded At
            </label>
            <input
              id="refund-date"
              type="datetime-local"
              value={refundedAt}
              onChange={(e) => setRefundedAt(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              When the money left. This is the period the refund lands in for reports — set it to the real payout date,
              even if that is a closed VAT period.
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}
