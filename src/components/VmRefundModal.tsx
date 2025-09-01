import { useState, useEffect } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { Button } from "./Button";
import { Modal } from "./Modal";
import {
  AdminVmInfo,
  AdminPaymentMethod,
  AdminRefundAmountInfo,
} from "../lib/api";
import { formatCurrency } from "../utils/currency";
import {
  ExclamationTriangleIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

interface VmRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  vm: AdminVmInfo | null;
  onSuccess: () => void;
}

export function VmRefundModal({
  isOpen,
  onClose,
  vm,
  onSuccess,
}: VmRefundModalProps) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] =
    useState<AdminRefundAmountInfo | null>(null);
  const [formData, setFormData] = useState({
    payment_method: AdminPaymentMethod.LIGHTNING,
    refund_from_date: "",
    reason: "",
    lightning_invoice: "",
  });

  useEffect(() => {
    if (isOpen && vm) {
      // Only reset form when modal first opens, not when VM data updates
      setFormData({
        payment_method: AdminPaymentMethod.LIGHTNING,
        refund_from_date: "",
        reason: "",
        lightning_invoice: "",
      });
      setRefundAmount(null);
      setError(null);
      // Auto-calculate refund for lightning by default
      calculateRefund(AdminPaymentMethod.LIGHTNING);
    }
    // Only depend on isOpen to prevent resets on VM data updates
  }, [isOpen]);

  const calculateRefund = async (
    method: AdminPaymentMethod,
    fromDateString?: string,
  ) => {
    if (!vm) return;

    try {
      setCalculating(true);
      setError(null);

      // Convert ISO date string to Unix timestamp if provided
      let fromTimestamp: number | undefined;
      if (fromDateString) {
        fromTimestamp = Math.floor(new Date(fromDateString).getTime() / 1000);
      }

      const amount = await adminApi.calculateVMRefund(
        vm.id,
        method,
        fromTimestamp,
      );
      setRefundAmount(amount);
    } catch (err) {
      console.error("Failed to calculate refund:", err);
      setError(
        err instanceof Error ? err.message : "Failed to calculate refund",
      );
      setRefundAmount(null);
    } finally {
      setCalculating(false);
    }
  };

  const handlePaymentMethodChange = (method: AdminPaymentMethod) => {
    setFormData((prev) => ({ ...prev, payment_method: method }));
    calculateRefund(method, formData.refund_from_date || undefined);
  };

  const handleFromDateChange = (date: string) => {
    setFormData((prev) => ({ ...prev, refund_from_date: date }));
    // Recalculate refund with new from date
    calculateRefund(formData.payment_method, date || undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vm) return;

    // Validate lightning invoice if payment method is lightning
    if (
      formData.payment_method === AdminPaymentMethod.LIGHTNING &&
      !formData.lightning_invoice.trim()
    ) {
      setError("Lightning invoice is required for lightning refunds");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const refundData = {
        payment_method: formData.payment_method,
        ...(formData.refund_from_date && {
          refund_from_date: Math.floor(
            new Date(formData.refund_from_date).getTime() / 1000,
          ),
        }),
        ...(formData.reason.trim() && { reason: formData.reason.trim() }),
        ...(formData.payment_method === AdminPaymentMethod.LIGHTNING &&
          formData.lightning_invoice.trim() && {
            lightning_invoice: formData.lightning_invoice.trim(),
          }),
      };

      const result = await adminApi.processVMRefund(vm.id, refundData);

      if (result.job_dispatched) {
        onSuccess();
        onClose();
        // You might want to show a success notification here
        console.log("Refund job dispatched:", result.job_id);
      }
    } catch (err) {
      console.error("Failed to process refund:", err);
      setError(err instanceof Error ? err.message : "Failed to process refund");
    } finally {
      setLoading(false);
    }
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
      title={`Process Refund - VM #${vm.id}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            isLoading={loading}
            disabled={calculating || !refundAmount}
          >
            Process Refund
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Warning */}
        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-yellow-400 font-medium">Refund Warning</h4>
              <p className="text-yellow-300/80 text-sm mt-1">
                This action will initiate an automated refund process. The
                refund will be processed asynchronously and you will receive
                notifications about its status.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.values(AdminPaymentMethod).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => handlePaymentMethodChange(method)}
                  disabled={calculating}
                  className={`flex items-center justify-center px-4 py-3 border rounded-lg font-medium transition-colors ${
                    formData.payment_method === method
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

          {/* Refund Amount Display */}
          {calculating ? (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-center text-gray-400">
                Calculating refund amount...
              </div>
            </div>
          ) : refundAmount ? (
            <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Refund Amount:</span>
                <span className="text-green-400 font-bold text-lg">
                  {formatCurrency(refundAmount.amount, refundAmount.currency)}
                  {refundAmount.rate !== 1 && (
                    <span className="text-sm text-gray-400 ml-2">
                      (Rate: {refundAmount.rate})
                    </span>
                  )}
                </span>
              </div>
              {formData.refund_from_date && (
                <div className="text-sm text-gray-400 mt-2">
                  Calculated from:{" "}
                  {new Date(formData.refund_from_date).toLocaleString()}
                </div>
              )}
            </div>
          ) : null}

          {/* Lightning Invoice (only for Lightning) */}
          {formData.payment_method === AdminPaymentMethod.LIGHTNING && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lightning Invoice *
              </label>
              <textarea
                value={formData.lightning_invoice}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lightning_invoice: e.target.value,
                  }))
                }
                placeholder="lnbc..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Lightning invoice where the refund will be paid
              </p>
            </div>
          )}

          {/* Refund From Date (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Refund From Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.refund_from_date}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Calculate refund from this date. Leave empty to calculate from
              current time.
            </p>
          </div>

          {/* Reason (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason (Optional)
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="e.g., Customer requested cancellation"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Error Display */}
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
