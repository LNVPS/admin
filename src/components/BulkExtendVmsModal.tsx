import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface BulkExtendVmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtended: () => void;
}

/**
 * Extend every active VM by a number of days — the compensate-customers-for-
 * downtime action, behind `virtual_machines::bulk_update`.
 *
 * Deliberately a two-step: "active" includes VMs that have already expired, so
 * this revives lapsed ones as well as extending live ones. The blast radius is
 * wider than the name suggests, and the one time it gets used is during an
 * incident, so the count goes in front of the button rather than after it.
 */
export function BulkExtendVmsModal({ isOpen, onClose, onExtended }: BulkExtendVmsModalProps) {
  const adminApi = useAdminApi();
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ extended: number; failed: number } | null>(null);
  /** Upper bound on what will be touched: every non-deleted VM. */
  const [vmCount, setVmCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDays("1");
    setReason("");
    setConfirming(false);
    setError(null);
    setResult(null);
    setVmCount(null);
    // Only the total is used, so ask for the narrowest page.
    adminApi
      .getVMs({ limit: 1, offset: 0 })
      .then((res) => setVmCount(res.total))
      .catch((err) => console.error("Failed to count VMs:", err));
  }, [isOpen, adminApi]);

  const parsedDays = Number.parseInt(days, 10);
  const daysValid = Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 365;

  const handleExtend = async () => {
    if (!daysValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.extendAllVMs(parsedDays, reason.trim() || undefined);
      setResult(res);
      onExtended();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extend VMs");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Extend All VMs" size="md">
      <div className="space-y-4">
        {result ? (
          <>
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-200">
              Extended <span className="font-semibold">{result.extended}</span> VM(s) by {parsedDays} day(s).
              {result.failed > 0 && (
                <>
                  {" "}
                  <span className="font-semibold text-red-300">{result.failed}</span> failed — see the server logs for
                  which and why.
                </>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="button" variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400">
              Extends the expiry of <span className="text-white">every active VM</span> in one request. Intended for
              compensating customers after downtime.
            </p>

            <div className="flex gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p>
                  "Active" includes VMs that have <span className="font-semibold">already expired</span>, so this
                  revives lapsed ones. Never-paid pending orders and deleted VMs are excluded.
                </p>
                <p>
                  {vmCount === null ? (
                    "Counting VMs..."
                  ) : (
                    <>
                      Up to <span className="font-semibold">{vmCount}</span> non-deleted VM(s) are in scope.
                    </>
                  )}
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
            )}

            <div>
              <label htmlFor="bulk-extend-days" className="block text-xs font-medium text-white mb-2">
                Days to extend by
              </label>
              <input
                id="bulk-extend-days"
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(e) => {
                  setDays(e.target.value);
                  setConfirming(false);
                }}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">1–365. The API rejects anything outside that range.</p>
            </div>

            <div>
              <label htmlFor="bulk-extend-reason" className="block text-xs font-medium text-white mb-2">
                Reason (optional)
              </label>
              <input
                id="bulk-extend-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Compensation for 2026-07-27 outage"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">Recorded against each VM's history.</p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              {confirming ? (
                <Button type="button" variant="danger" onClick={handleExtend} disabled={loading || !daysValid}>
                  {loading ? "Extending..." : `Yes, extend every VM by ${parsedDays} day(s)`}
                </Button>
              ) : (
                <Button type="button" variant="primary" onClick={() => setConfirming(true)} disabled={!daysValid}>
                  Extend all VMs
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
