import { useEffect, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminHostDisk, AdminHostInfo, AdminMigrateIpPolicy, AdminMigratePlan, AdminVmInfo } from "../lib/api";
import { toastService } from "../services/toastService";
import { formatBytes } from "../utils/formatBytes";
import {
  canSubmitMigration,
  formatEstimate,
  MIGRATE_UNSUPPORTED_MESSAGE,
  type MigrateCapability,
  migrationMethodLabel,
  shouldRequestPlan,
} from "../utils/migratePlan";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface VmMigrateModalProps {
  isOpen: boolean;
  onClose: () => void;
  vm: AdminVmInfo | null;
  onMigrating: () => void;
}

export function VmMigrateModal({ isOpen, onClose, vm, onMigrating }: VmMigrateModalProps) {
  const adminApi = useAdminApi();
  const [hosts, setHosts] = useState<AdminHostInfo[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [targetHostId, setTargetHostId] = useState("");
  const [live, setLive] = useState(false);
  const [reason, setReason] = useState("");
  const [disks, setDisks] = useState<AdminHostDisk[]>([]);
  const [targetDiskId, setTargetDiskId] = useState("");
  const [ipPolicy, setIpPolicy] = useState<AdminMigrateIpPolicy>("keep");
  const [keepSource, setKeepSource] = useState(true);
  const [reassignConfirmed, setReassignConfirmed] = useState(false);
  const [plan, setPlan] = useState<AdminMigratePlan | null>(null);
  const [capability, setCapability] = useState<MigrateCapability>("checking");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTargetHostId("");
    setLive(false);
    setReason("");
    setTargetDiskId("");
    setIpPolicy("keep");
    setKeepSource(true);
    setReassignConfirmed(false);
    setPlan(null);
    setPlanError(null);
    setError(null);

    setLoadingHosts(true);
    adminApi
      .getHosts({ limit: 1000, offset: 0 })
      .then((res) => setHosts(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load hosts"))
      .finally(() => setLoadingHosts(false));
  }, [isOpen, adminApi]);

  const vmId = vm?.id;

  useEffect(() => {
    if (!isOpen || vmId === undefined) return;
    let cancelled = false;
    setCapability("checking");
    adminApi
      .supportsMigratePlan(vmId)
      .then((ok) => {
        if (!cancelled) setCapability(ok ? "supported" : "unsupported");
      })
      .catch(() => {
        if (!cancelled) setCapability("unsupported");
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, vmId, adminApi]);

  useEffect(() => {
    setDisks([]);
    setTargetDiskId("");
    if (!isOpen || targetHostId === "") return;
    let cancelled = false;
    adminApi
      .getHostDisks(Number.parseInt(targetHostId, 10))
      .then((res) => {
        if (!cancelled) setDisks(res.filter((d) => d.enabled));
      })
      .catch((err) => {
        if (!cancelled) setPlanError(err instanceof Error ? err.message : "Failed to load storage pools");
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, targetHostId, adminApi]);

  useEffect(() => {
    setPlan(null);
    setPlanError(null);
    setReassignConfirmed(false);
    if (!isOpen || vmId === undefined || !shouldRequestPlan(capability, targetHostId)) return;
    let cancelled = false;
    setPlanLoading(true);
    adminApi
      .migrateVM(vmId, {
        target_host_id: Number.parseInt(targetHostId, 10),
        ip_policy: ipPolicy,
        keep_source: keepSource,
        dry_run: true,
        ...(targetDiskId && { target_disk_id: Number.parseInt(targetDiskId, 10) }),
      })
      .then((res) => {
        if (!cancelled) setPlan(res.plan);
      })
      .catch((err) => {
        if (!cancelled) setPlanError(err instanceof Error ? err.message : "Failed to plan migration");
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, vmId, targetHostId, targetDiskId, ipPolicy, keepSource, capability, adminApi]);

  if (!vm) return null;

  const sourceHost = hosts.find((h) => h.id === vm.host_id);
  const candidates = hosts.filter((h) => h.enabled && h.id !== vm.host_id);

  const canSubmit =
    canSubmitMigration({
      capability,
      plan,
      planLoading,
      submitting,
      targetHostId,
      reassignConfirmed,
      ipPolicy,
    }) && !loadingHosts;

  const handleMigrate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await adminApi.migrateVM(vm.id, {
        target_host_id: Number.parseInt(targetHostId, 10),
        ip_policy: ipPolicy,
        keep_source: keepSource,
        ...(targetDiskId && { target_disk_id: Number.parseInt(targetDiskId, 10) }),
        ...(live && { live: true }),
        ...(reason.trim() && { reason: reason.trim() }),
      });
      toastService.info(
        "Migration queued",
        `VM ${vm.id} is being migrated (job ${(result.job_id ?? "").slice(0, 8)}...). Pre-flight checks run on the worker.`,
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
          Move this VM from <span className="text-white">{vm.region_name}</span> to any enabled host. Without a storage
          pool choice, the pool matching the source pool name is used, otherwise the one with the most free space.
        </p>

        {capability === "unsupported" && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            {MIGRATE_UNSUPPORTED_MESSAGE}
          </div>
        )}

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
            {candidates.map((host) => (
              <option key={host.id} value={host.id}>
                {host.name} ({host.kind}, {host.region.name}) load {Math.round(host.load_cpu * 100)}/
                {Math.round(host.load_memory * 100)}/{Math.round(host.load_disk * 100)}%
                {host.sunset_date ? " (sunsetting)" : ""}
              </option>
            ))}
          </select>
        </div>

        {targetHostId !== "" && (
          <div>
            <label htmlFor="migrate-target-disk" className="block text-xs font-medium text-white mb-2">
              Storage pool
            </label>
            <select id="migrate-target-disk" value={targetDiskId} onChange={(e) => setTargetDiskId(e.target.value)}>
              <option value="">Automatic</option>
              {disks.map((disk) => (
                <option key={disk.id} value={disk.id}>
                  {disk.name} ({disk.kind}, {formatBytes(disk.size)})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="migrate-ip-policy" className="block text-xs font-medium text-white mb-2">
            IP addresses
          </label>
          <select
            id="migrate-ip-policy"
            value={ipPolicy}
            onChange={(e) => setIpPolicy(e.target.value as AdminMigrateIpPolicy)}
          >
            <option value="keep">Keep current addresses</option>
            <option value="reassign">Reassign addresses from the target network</option>
          </select>
        </div>

        <div className="flex items-start space-x-2">
          <input
            id="migrate-keep-source"
            type="checkbox"
            checked={keepSource}
            onChange={(e) => setKeepSource(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <label htmlFor="migrate-keep-source" className="text-sm text-gray-300">
            Keep source copy
            <span className="block text-xs text-gray-500">
              The stopped VM stays on the source host so the move can be undone.
            </span>
          </label>
        </div>

        {targetHostId !== "" && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm space-y-2">
            <div className="text-xs font-medium text-white">Migration plan</div>
            {planLoading && <div className="text-gray-400">Planning...</div>}
            {planError && <div className="text-red-300">{planError}</div>}
            {plan && (
              <>
                <div>
                  <span className="text-gray-400">Method: </span>
                  <span className="text-white">{migrationMethodLabel(plan.method)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Disk size: </span>
                  <span className="text-white">{formatBytes(plan.disk_bytes)}</span>
                  {plan.target_storage && <span className="text-gray-400"> to {plan.target_storage}</span>}
                </div>
                <div>
                  <span className="text-gray-400">Estimated downtime: </span>
                  <span className="text-white">{formatEstimate(plan.estimated_seconds)}</span>
                </div>
                {plan.warnings.map((w) => (
                  <div key={w} className="text-amber-300">
                    Warning: {w}
                  </div>
                ))}
                {plan.refusals.map((r) => (
                  <div key={r} className="text-red-300">
                    Refused: {r}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {ipPolicy === "reassign" && plan && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100 space-y-2">
            <div>The customer's IP addresses will change:</div>
            <ul className="list-disc pl-5">
              {plan.ip_changes.map((c) => (
                <li key={c.old_ip}>
                  {c.old_ip} to {c.new_ip ?? "a new address allocated on migration"}
                </li>
              ))}
            </ul>
            <div className="flex items-start space-x-2">
              <input
                id="migrate-reassign-confirm"
                type="checkbox"
                checked={reassignConfirmed}
                onChange={(e) => setReassignConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <label htmlFor="migrate-reassign-confirm">
                I understand the customer's addresses change and they will be notified.
              </label>
            </div>
          </div>
        )}

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
