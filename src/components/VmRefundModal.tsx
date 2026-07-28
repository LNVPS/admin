import { CreditCardIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { AdminPaymentMethod, type AdminRefundAmountInfo, type AdminVmInfo } from "../lib/api";
import { formatCurrency } from "../utils/currency";
import { Button } from "./Button";
import { Modal } from "./Modal";

// The estimate endpoint only quotes for these methods.
const REFUNDABLE_PAYMENT_METHODS = [
  AdminPaymentMethod.LIGHTNING,
  AdminPaymentMethod.REVOLUT,
  AdminPaymentMethod.PAYPAL,
];

interface VmRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  vm: AdminVmInfo | null;
}

/**
 * Quote the pro-rated value of a VM's unused time.
 *
 * This is an **estimate only**. `POST /api/admin/v1/vms/{id}/refund` answers
 * `501`: automated payout was never implemented, and until api#193 it returned
 * `200` with a job id while moving no money and writing no record — an operator
 * could refund a customer and have nothing to show for it. The modal therefore
 * no longer submits anything.
 *
 * Note also that this figure is computed from the cost plan at a *live* rate
 * with *no tax*, which is why it cannot be the recorded amount: a refund must
 * reverse what was actually charged, at the rate and VAT frozen on that
 * payment. Pay the customer out of band, then record it against the specific
 * payment from the Payments tab.
 */
export function VmRefundModal({ isOpen, onClose, vm }: VmRefundModalProps) {
  const adminApi = useAdminApi();
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<AdminRefundAmountInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState(AdminPaymentMethod.LIGHTNING);
  const [fromDate, setFromDate] = useState("");

  useEffect(() => {
    if (isOpen && vm) {
      setPaymentMethod(AdminPaymentMethod.LIGHTNING);
      setFromDate("");
      setRefundAmount(null);
      setError(null);
      calculateRefund(AdminPaymentMethod.LIGHTNING);
    }
    // Only depend on isOpen to prevent resets on VM data updates
  }, [isOpen]);

  const calculateRefund = async (method: AdminPaymentMethod, fromDateString?: string) => {
    if (!vm) return;

    try {
      setCalculating(true);
      setError(null);
      const fromTimestamp = fromDateString ? Math.floor(new Date(fromDateString).getTime() / 1000) : undefined;
      const amount = await adminApi.calculateVMRefund(vm.id, method, fromTimestamp);
      setRefundAmount(amount);
    } catch (err) {
      console.error("Failed to calculate refund:", err);
      setError(err instanceof Error ? err.message : "Failed to calculate refund");
      setRefundAmount(null);
    } finally {
      setCalculating(false);
    }
  };

  const handlePaymentMethodChange = (method: AdminPaymentMethod) => {
    setPaymentMethod(method);
    calculateRefund(method, fromDate || undefined);
  };

  const handleFromDateChange = (date: string) => {
    setFromDate(date);
    calculateRefund(paymentMethod, date || undefined);
  };

  const formatPaymentMethodName = (method: AdminPaymentMethod): string => {
    switch (method) {
      case AdminPaymentMethod.LIGHTNING:
        return "Lightning";
      case AdminPaymentMethod.PAYPAL:
        return "PayPal";
      case AdminPaymentMethod.REVOLUT:
        return "Revolut";
      default:
        return method;
    }
  };

  if (!vm) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Refund Estimate — VM #${vm.id}`}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-yellow-400 font-medium">Estimate only — nothing is paid out</h4>
              <p className="text-yellow-300/80 text-sm mt-1">
                Automated refund payout is not implemented. This quote is the pro-rated value of the VM's unused time,
                computed from the cost plan at today's exchange rate and <strong>excluding tax</strong>. Pay the
                customer out of band, then record the refund against the specific payment it reverses from the{" "}
                <strong>Payments</strong> tab — that entry copies the payment's frozen rate and VAT, which is what
                accounting needs.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-gray-300 mb-2">Quote For</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {REFUNDABLE_PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => handlePaymentMethodChange(method)}
                  disabled={calculating}
                  className={`flex items-center justify-center px-4 py-3 border rounded-lg font-medium transition-colors ${
                    paymentMethod === method
                      ? "border-blue-500 bg-blue-900/20 text-blue-300"
                      : "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                  } ${calculating ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  {formatPaymentMethodName(method)}
                </button>
              ))}
            </div>
          </div>

          {calculating ? (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-center text-gray-400">Calculating refund amount...</div>
            </div>
          ) : refundAmount ? (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Estimated Refund (excl. tax):</span>
                <span className="text-slate-100 font-bold text-lg">
                  {formatCurrency(refundAmount.amount, refundAmount.currency)}
                  {refundAmount.rate !== 1 && (
                    <span className="text-sm text-gray-400 ml-2">(Rate: {refundAmount.rate})</span>
                  )}
                </span>
              </div>
              {fromDate && (
                <div className="text-sm text-gray-400 mt-2">Calculated from: {new Date(fromDate).toLocaleString()}</div>
              )}
            </div>
          ) : null}

          <div>
            <label htmlFor="refund-estimate-from" className="block text-sm font-medium text-gray-300 mb-2">
              Refund From Date (Optional)
            </label>
            <input
              id="refund-estimate-from"
              type="datetime-local"
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Calculate refund from this date. Leave empty to calculate from current time.
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
