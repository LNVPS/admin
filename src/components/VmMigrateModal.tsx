import { useEffect, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminHostInfo, AdminVmInfo } from "../lib/api";
import { toastService } from "../services/toastService";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface VmMigrateModalProps {
  isOpen: boolean;
  onClose: () => void;
  vm: AdminVmInfo | null;
  onMigrating: () => void;
}

/** Why a host cannot be picked, or null when it can. Mirrors the worker's pre-flight. */
function ineligibleReason(host: AdminHostInfo, vm: AdminVmInfo, source: AdminHostInfo | undefined): string | null {
  if (host.id === vm.host_id) return "current host";
  if (!host.enabled) return "disabled";
  if (host.sunset_date) return "sunsetting";
  if (host.region.id !== vm.region_id) return "different region";
  if (source && host.kind !== source.kind) return `different hypervisor (${host.kind})`;
  if (source && host.cpu_arch !== source.cpu_arch) return `different CPU arch (${host.cpu_arch ?? "unknown"})`;
  return null;
}

export function VmMigrateModal({ isOpen, onClose, vm, onMigrating }: VmMigrateModalProps) {
  const adminApi = useAdminApi();
  const [hosts, setHosts] = useState<AdminHostInfo[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [targetHostId, setTargetHostId] = useState("");
  const [live, setLive] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTargetHostId("");
    setLive(false);
    setReason("");
    setError(null);

    setLoadingHosts(true);
    adminApi
      .getHosts({ limit: 1000, offset: 0 })
      .then((res) => setHosts(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load hosts"))
      .finally(() => setLoadingHosts(false));
  }, [isOpen, adminApi]);

  if (!vm) return null;

  const sourceHost = hosts.find((h) => h.id === vm.host_id);
  // Only same-region hosts are offered at all: a cross-region move would strand
  // the VM's IP assignments, which are not rewritten by the migration.
  const candidates = hosts.filter((h) => h.region.id === vm.region_id);
  const eligibleCount = candidates.filter((h) => ineligibleReason(h, vm, sourceHost) === null).length;

  const canSubmit = !submitting && !loadingHosts && targetHostId !== "";

  const handleMigrate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await adminApi.migrateVM(vm.id, {
        target_host_id: Number.parseInt(targetHostId, 10),
        ...(live && { live: true }),
        ...(reason.trim() && { reason: reason.trim() }),
      });
      toastService.info(
        "Migration queued",
        `VM ${vm.id} is being migrated (job ${result.job_id.slice(0, 8)}...). Pre-flight checks run on the worker.`,
      );
      onClose();
      onMigrating();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to migrate VM");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Migrate VM #${vm.id}`} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Move this VM to another host in <span className="text-white">{vm.region_name}</span>. The destination disk
          pool is the one matching the source pool name where it exists (nothing is copied on shared storage), otherwise
          the emptiest pool with room. Proxmox hosts only.
        </p>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm">
          <span className="text-gray-400">Current host: </span>
          <span className="text-white">{vm.host_name || `#${vm.host_id}`}</span>
          {sourceHost && (
            <span className="text-gray-400">
              {" "}
              ({sourceHost.kind}
              {sourceHost.cpu_arch ? `, ${sourceHost.cpu_arch}` : ""})
            </span>
          )}
        </div>

        <div>
          <label htmlFor="migrate-target-host" className="block text-xs font-medium text-white mb-2">
            Target host
          </label>
          <select
            id="migrate-target-host"
            value={targetHostId}
            onChange={(e) => setTargetHostId(e.target.value)}
            disabled={loadingHosts}
          >
            <option value="">{loadingHosts ? "Loading hosts..." : "Select a host..."}</option>
            {candidates.map((host) => {
              const reasonText = ineligibleReason(host, vm, sourceHost);
              return (
                <option key={host.id} value={host.id} disabled={reasonText !== null}>
                  {host.name} — {Math.round(host.load_cpu * 100)}% cpu / {Math.round(host.load_memory * 100)}% mem /{" "}
                  {Math.round(host.load_disk * 100)}% disk
                  {reasonText ? ` (${reasonText})` : ""}
                </option>
              );
            })}
          </select>
          {!loadingHosts && eligibleCount === 0 && (
            <p className="mt-2 text-xs text-amber-300">
              No eligible host in this region — a target must be enabled and match the source's hypervisor kind and CPU
              architecture.
            </p>
          )}
        </div>

        <div className="flex items-start space-x-2">
          <input
            id="migrate-live"
            type="checkbox"
            checked={live}
            onChange={(e) => setLive(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <label htmlFor="migrate-live" className="text-sm text-gray-300">
            Live migration
            <span className="block text-xs text-gray-500">
              Keep the VM online during the move. When off, the VM is stopped, migrated and started again on the
              destination.
            </span>
          </label>
        </div>

        <div>
          <label htmlFor="migrate-reason" className="block text-xs font-medium text-white mb-2">
            Reason (optional)
          </label>
          <input
            id="migrate-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Draining host for maintenance"
            autoComplete="off"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleMigrate} disabled={!canSubmit}>
            {submitting ? "Queueing..." : "Migrate VM"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
