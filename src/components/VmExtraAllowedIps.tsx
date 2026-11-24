import { ShieldCheckIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminVmExtraAllowedIp } from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { Button } from "./Button";

export function VmExtraAllowedIps({ vmId }: { vmId: number }) {
  const adminApi = useAdminApi();
  const { hasPermission } = useUserRoles();
  const canEdit = hasPermission("virtual_machines::update");
  const [entries, setEntries] = useState<AdminVmExtraAllowedIp[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ip, setIp] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEntries(await adminApi.listVmExtraAllowedIps(vmId));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [adminApi, vmId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await adminApi.addVmExtraAllowedIp(vmId, { ip: ip.trim(), comment: comment.trim() });
      setIp("");
      setComment("");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: AdminVmExtraAllowedIp) => {
    const ok = await confirmDialog({
      title: "Remove allowed IP",
      message: `Stop allowing ${entry.ip} on this VM? The VM will no longer be able to send from it.`,
      confirmText: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await adminApi.removeVmExtraAllowedIp(vmId, entry.id);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="bg-gray-800 border border-slate-700 rounded-lg p-4" data-testid="vm-extra-allowed-ips">
      <h3 className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
        <ShieldCheckIcon className="h-4 w-4" />
        Extra Allowed IPs
        <span className="text-xs font-normal text-gray-500">not visible to the customer</span>
      </h3>
      <p className="mb-3 text-xs text-gray-500">
        Addresses this VM may send from besides its own, such as a floating VIP. Kept in the Proxmox ipfilter set.
      </p>

      {loadError ? (
        <p className="text-sm text-red-400">{loadError}</p>
      ) : entries === null ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500">None.</p>
      ) : (
        <ul className="divide-y divide-slate-700">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 py-1.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="break-all font-mono text-xs text-gray-200">{entry.ip}</div>
                <div className="break-words text-xs text-gray-400">{entry.comment}</div>
              </div>
              {canEdit && (
                <Button
                  variant="ghost-danger"
                  size="xs"
                  onClick={() => remove(entry)}
                  title={`Remove ${entry.ip}`}
                  aria-label={`Remove ${entry.ip}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form onSubmit={add} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
          <input
            aria-label="Address"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="185.18.221.135"
            className="min-w-0 font-mono text-sm sm:w-72"
            required
          />
          <input
            aria-label="Comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="k8s ingress VIP"
            maxLength={200}
            className="min-w-0 flex-1 text-sm"
            required
          />
          <Button type="submit" size="sm" disabled={saving || !ip.trim() || !comment.trim()}>
            {saving ? "Adding..." : "Add"}
          </Button>
        </form>
      )}
      {formError && <p className="mt-2 text-xs text-red-400">{formError}</p>}
    </div>
  );
}
