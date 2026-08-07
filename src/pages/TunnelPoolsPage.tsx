import {
  ArrowPathIcon,
  GlobeAltIcon,
  KeyIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useCachedRegions } from "../hooks/useCachedRegions";
import type { AdminRouterDetail, AdminTunnelPoolInfo } from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";

const DEFAULT_MTU = 1420;
const DEFAULT_PORT = 51820;

function _formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export function TunnelPoolsPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editing, setEditing] = useState<AdminTunnelPoolInfo | null>(null);

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const handleDelete = async (pool: AdminTunnelPoolInfo) => {
    if (
      !(await confirmDialog({
        title: "Delete Tunnel Pool",
        message: `Delete tunnel pool "${pool.name}" (${pool.interface})? This also removes the interface from the route server. Refused while any tunnel is still allocated.`,
      }))
    ) {
      return;
    }
    try {
      await adminApi.deleteTunnelPool(pool.id);
      toastService.success("Tunnel pool deleted");
      refreshData();
    } catch (err) {
      toastService.error("Failed to delete tunnel pool", err instanceof Error ? err.message : undefined);
    }
  };

  const handleSync = async (pool: AdminTunnelPoolInfo) => {
    if (
      !(await confirmDialog({
        title: "Sync Tunnel Pool",
        message: `Re-apply "${pool.name}" (${pool.interface}) on its route server and reconcile its peers?`,
        confirmText: "Sync",
      }))
    ) {
      return;
    }
    try {
      const result = await adminApi.syncTunnelPool(pool.id);
      toastService.info("Sync queued", `Job ${result.job_id.slice(0, 8)}… is processing`);
    } catch (err) {
      toastService.error("Failed to queue sync", err instanceof Error ? err.message : undefined);
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Pool</th>
      <th>Interface / Router</th>
      <th>Endpoint</th>
      <th>Blocks</th>
      <th>Capacity</th>
      <th>MTU</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (pool: AdminTunnelPoolInfo, index: number) => (
    <tr key={pool.id || index}>
      <td className="whitespace-nowrap align-top text-white">{pool.id}</td>
      <td className="align-top">
        <div className="min-w-0 max-w-[14rem]">
          <div className="truncate font-medium text-white" title={pool.name}>
            {pool.name}
          </div>
          <div className="text-[11px] text-gray-500">{pool.region_name}</div>
        </div>
      </td>
      <td className="align-top">
        <div className="flex items-center gap-1 font-mono text-xs text-gray-300">
          <LinkIcon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
          <span title={pool.interface}>{pool.interface}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-gray-500" title={pool.router_name}>
          {pool.router_name}
        </div>
      </td>
      <td className="align-top">
        <div className="font-mono text-xs text-gray-300" title={pool.endpoint}>
          {pool.endpoint}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-500">
          <KeyIcon className="h-3 w-3 shrink-0" />
          <span className="truncate font-mono" title={pool.public_key}>
            {pool.public_key.slice(0, 16)}…
          </span>
        </div>
      </td>
      <td className="align-top font-mono text-xs text-gray-300">
        <div>{pool.cidr4 ?? "—"}</div>
        <div className="text-gray-500">{pool.cidr6 ?? "—"}</div>
      </td>
      <td className="align-top text-gray-300">
        <span className={pool.links_used >= pool.links_total ? "text-red-400" : ""}>
          {pool.links_used} / {pool.links_total}
        </span>
      </td>
      <td className="align-top text-gray-300">{pool.mtu}</td>
      <td className="align-top">
        {pool.enabled ? (
          <StatusBadge status="active">Enabled</StatusBadge>
        ) : (
          <StatusBadge status="inactive">Disabled</StatusBadge>
        )}
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="Sync interface & peers on route server"
            onClick={() => handleSync(pool)}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Edit" onClick={() => setEditing(pool)}>
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            title="Delete"
            onClick={() => handleDelete(pool)}
            disabled={pool.links_used > 0}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-600" />
      <h3 className="mt-2 text-sm font-medium text-gray-300">No tunnel pools</h3>
      <p className="mt-1 text-sm text-gray-500">
        Tunnel pools supply the WireGuard inner addresses that marketplace nodes use.
      </p>
      <div className="mt-6">
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Tunnel Pool
        </Button>
      </div>
    </div>
  );

  const calculateStats = (pools: AdminTunnelPoolInfo[], totalItems: number) => {
    const enabled = pools.filter((p) => p.enabled).length;
    const disabled = pools.filter((p) => !p.enabled).length;
    const used = pools.reduce((sum, p) => sum + p.links_used, 0);
    const total = pools.reduce((sum, p) => sum + p.links_total, 0);

    return (
      <StatsHeader
        title="Tunnel Pools"
        subtitle="Where tunnel inner addresses are allocated from — the WireGuard equivalent of an IP range. LNVPS manages the interface end to end."
        stats={[
          { label: "Total", value: totalItems },
          { label: "Enabled", value: enabled, tone: "success" },
          { label: "Disabled", value: disabled, tone: "warning" },
          { label: "Links", value: `${used} / ${total}`, tone: "accent" },
        ]}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Tunnel Pool
          </Button>
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getTunnelPools(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view tunnel pools"
        loadingMessage="Loading tunnel pools..."
        dependencies={[refreshTrigger]}
        minWidth="1100px"
      />

      {showCreateModal && (
        <CreateTunnelPoolModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refreshData();
          }}
        />
      )}

      {editing && (
        <EditTunnelPoolModal
          pool={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
}

function CreateTunnelPoolModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const adminApi = useAdminApi();
  const { data: regions } = useCachedRegions();
  const [routers, setRouters] = useState<AdminRouterDetail[]>([]);
  const [loadingRouters, setLoadingRouters] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    router_id: 0,
    region_id: 0,
    name: "",
    listen_addr: "",
    listen_port: String(DEFAULT_PORT),
    private_key: "",
    cidr4: "",
    cidr6: "",
    keepalive: "",
    mtu: String(DEFAULT_MTU),
    enabled: true,
  });

  const loadRouters = async () => {
    setLoadingRouters(true);
    try {
      const response = await adminApi.getRouters({ limit: 100 });
      setRouters(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load routers");
    } finally {
      setLoadingRouters(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await adminApi.createTunnelPool({
        router_id: formData.router_id,
        region_id: formData.region_id,
        name: formData.name,
        listen_addr: formData.listen_addr,
        listen_port: formData.listen_port ? Number(formData.listen_port) : undefined,
        private_key: formData.private_key.trim() || undefined,
        cidr4: formData.cidr4.trim() || undefined,
        cidr6: formData.cidr6.trim() || undefined,
        keepalive: formData.keepalive ? Number(formData.keepalive) : undefined,
        mtu: formData.mtu ? Number(formData.mtu) : undefined,
        enabled: formData.enabled,
      });
      toastService.success("Tunnel pool created", "The interface is being configured on the route server.");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tunnel pool");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Tunnel Pool" size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Route server *</label>
            <select
              value={formData.router_id || ""}
              onChange={(e) => setFormData({ ...formData, router_id: Number(e.target.value) })}
              onFocus={() => {
                if (routers.length === 0 && !loadingRouters) loadRouters();
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            >
              <option value="">{loadingRouters ? "Loading routers…" : "Select a route server…"}</option>
              {routers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Terminates peers from this pool.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Region *</label>
            <select
              value={formData.region_id || ""}
              onChange={(e) => setFormData({ ...formData, region_id: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            >
              <option value="">Select a region…</option>
              {regions?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="e.g. lon marketplace"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Listen address *</label>
            <input
              type="text"
              value={formData.listen_addr}
              onChange={(e) => setFormData({ ...formData, listen_addr: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
              placeholder="rs1.example.com"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              The address peers send to — an address, not host:port or a URL.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Listen port</label>
            <input
              type="number"
              value={formData.listen_port}
              onChange={(e) => setFormData({ ...formData, listen_port: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Defaults to 51820. Unique per route server.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">IPv4 block</label>
            <input
              type="text"
              value={formData.cidr4}
              onChange={(e) => setFormData({ ...formData, cidr4: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
              placeholder="10.66.0.0/16"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">IPv6 block</label>
            <input
              type="text"
              value={formData.cidr6}
              onChange={(e) => setFormData({ ...formData, cidr6: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
              placeholder="fd00:66::/48"
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-gray-400">Inner blocks links are carved from. At least one is required.</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Keepalive (s)</label>
            <input
              type="number"
              value={formData.keepalive}
              onChange={(e) => setFormData({ ...formData, keepalive: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="e.g. 25"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">MTU</label>
            <input
              type="number"
              value={formData.mtu}
              onChange={(e) => setFormData({ ...formData, mtu: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Defaults to 1420.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Adopt an existing interface (private key)
          </label>
          <input
            type="text"
            value={formData.private_key}
            onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
            placeholder="base64 private key (optional)"
          />
          <p className="text-xs text-gray-400 mt-1">
            Omit (the normal case) to generate a fresh keypair and configure the interface. Supply a base64 key only to
            adopt one that already exists.
          </p>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
          />
          <span className="text-sm text-gray-300">Enabled</span>
        </label>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Creating…" : "Create Tunnel Pool"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditTunnelPoolModal({
  pool,
  onClose,
  onSuccess,
}: {
  pool: AdminTunnelPoolInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const { data: regions } = useCachedRegions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    region_id: pool.region_id,
    name: pool.name,
    listen_addr: pool.listen_addr,
    listen_port: String(pool.listen_port),
    private_key: "",
    cidr4: pool.cidr4 ?? "",
    cidr6: pool.cidr6 ?? "",
    keepalive: pool.keepalive !== null ? String(pool.keepalive) : "",
    mtu: String(pool.mtu),
    enabled: pool.enabled,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await adminApi.updateTunnelPool(pool.id, {
        region_id: formData.region_id,
        name: formData.name,
        listen_addr: formData.listen_addr,
        listen_port: formData.listen_port ? Number(formData.listen_port) : undefined,
        private_key: formData.private_key.trim() || undefined,
        cidr4: formData.cidr4.trim() || null,
        cidr6: formData.cidr6.trim() || null,
        keepalive: formData.keepalive ? Number(formData.keepalive) : null,
        mtu: formData.mtu ? Number(formData.mtu) : undefined,
        enabled: formData.enabled,
      });
      toastService.success("Tunnel pool updated", "The interface is being re-applied on the route server.");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tunnel pool");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit tunnel pool — ${pool.name}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
          <LinkIcon className="h-4 w-4 shrink-0 text-gray-400" />
          <div className="text-sm">
            <span className="font-mono text-white">{pool.interface}</span>
            <span className="text-gray-400"> on </span>
            <span className="text-gray-300">{pool.router_name}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Region</label>
            <select
              value={formData.region_id || ""}
              onChange={(e) => setFormData({ ...formData, region_id: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">Select a region…</option>
              {regions?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Listen address</label>
            <input
              type="text"
              value={formData.listen_addr}
              onChange={(e) => setFormData({ ...formData, listen_addr: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Listen port</label>
            <input
              type="number"
              value={formData.listen_port}
              onChange={(e) => setFormData({ ...formData, listen_port: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">MTU</label>
            <input
              type="number"
              value={formData.mtu}
              onChange={(e) => setFormData({ ...formData, mtu: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">IPv4 block</label>
            <input
              type="text"
              value={formData.cidr4}
              onChange={(e) => setFormData({ ...formData, cidr4: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">Cannot shrink below an allocated tunnel.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">IPv6 block</label>
            <input
              type="text"
              value={formData.cidr6}
              onChange={(e) => setFormData({ ...formData, cidr6: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Keepalive (s)</label>
          <input
            type="number"
            value={formData.keepalive}
            onChange={(e) => setFormData({ ...formData, keepalive: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="Blank clears"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Re-key interface (private key)</label>
          <input
            type="text"
            value={formData.private_key}
            onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
            placeholder="Leave blank to keep current key; type to re-key"
          />
          <p className="text-xs text-gray-400 mt-1">
            Supplying a key re-keys the interface and cuts every node holding the old public key until it re-reads its
            config. A blank value generates a fresh keypair.
          </p>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
          />
          <span className="text-sm text-gray-300">Enabled</span>
        </label>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
