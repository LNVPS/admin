import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminSwapInfo, AdminSwapOrderClient } from "../lib/api";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface PaymentSwapLogProps {
  paymentId: string;
  swap?: AdminSwapInfo;
  userId?: number;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-2 border-b border-slate-700/50 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-200">{children}</dd>
    </div>
  );
}

export function PaymentSwapLog({ paymentId, swap, userId }: PaymentSwapLogProps) {
  const adminApi = useAdminApi();
  const { hasPermission } = useUserRoles();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<AdminSwapOrderClient | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  if (!hasPermission("subscription_payments::view")) return null;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = swap ? { order_id: swap.order_id, limit: 100 } : { user_id: userId, limit: 100 };
      const res = await adminApi.getSwapOrders(params);
      setEntry(res.data.find((row) => row.payment_id === paymentId) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load swap log");
    } finally {
      setLoading(false);
    }
  };

  const open = () => {
    setIsOpen(true);
    if (entry === undefined && !loading) load();
  };

  return (
    <div className="mt-1.5 text-xs">
      <Button size="xs" variant="ghost" onClick={open} title="Show the swap order log for this payment">
        Swap log
      </Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Swap log" size="lg">
        <div className="text-sm">
          {loading && <div className="text-slate-400">Loading...</div>}
          {error && (
            <div className="space-y-3">
              <div className="text-red-400">{error}</div>
              <Button size="sm" variant="secondary" onClick={load}>
                Retry
              </Button>
            </div>
          )}
          {entry === null && (
            <div className="text-slate-400">No swap log entry (none recorded, or older than 13 months)</div>
          )}
          {entry && (
            <dl>
              <Field label="Payment">
                <span className="font-mono">{entry.payment_id}</span>
              </Field>
              <Field label="Order">
                <a
                  href={`https://ff.io/order/${entry.order_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-blue-400 hover:underline"
                >
                  {entry.order_id}
                </a>
              </Field>
              <Field label="Coin">{entry.coin}</Field>
              {swap && (
                <>
                  <Field label="Deposit amount">
                    <span className="font-mono">
                      {swap.deposit_amount} {swap.coin}
                    </span>
                  </Field>
                  <Field label="Deposit address">
                    <span className="font-mono">{swap.deposit_address}</span>
                  </Field>
                  <Field label="Receive address">
                    <span className="font-mono">{swap.receive_address}</span>
                  </Field>
                </>
              )}
              <Field label="User">{entry.user_id}</Field>
              <Field label="IP">
                <span className="font-mono">{entry.ip}</span>
              </Field>
              <Field label="User agent">{entry.user_agent}</Field>
              <Field label="Language">
                <span className="font-mono">{entry.accept_language || "-"}</span>
              </Field>
              <Field label="Placed">{new Date(entry.created).toLocaleString()}</Field>
            </dl>
          )}
        </div>
      </Modal>
    </div>
  );
}
