import { useEffect, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface VmTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  vmId: number;
  onTransferred: () => void;
}

export function VmTransferModal({ isOpen, onClose, vmId, onTransferred }: VmTransferModalProps) {
  const adminApi = useAdminApi();
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUserId("");
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  const targetUserId = Number.parseInt(userId, 10);
  const canSubmit = !loading && Number.isInteger(targetUserId) && targetUserId > 0;

  const handleTransfer = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await adminApi.transferVM(vmId, targetUserId, reason.trim() || undefined);
      onClose();
      onTransferred();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer VM");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Transfer VM #${vmId}`} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Reassign this VM and its billing subscription to another user account (e.g. for account recovery). The old
          owner's SSH key is cleared from the VM.
        </p>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        <div>
          <label htmlFor="transfer-user-id" className="block text-xs font-medium text-white mb-2">
            Target user ID
          </label>
          <input
            id="transfer-user-id"
            type="number"
            min={1}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g. 42"
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="transfer-reason" className="block text-xs font-medium text-white mb-2">
            Reason (optional)
          </label>
          <input
            id="transfer-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Account recovery"
            autoComplete="off"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleTransfer} disabled={!canSubmit}>
            {loading ? "Transferring..." : "Transfer VM"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
