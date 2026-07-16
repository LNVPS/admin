import { PencilIcon, PlusIcon, ServerStackIcon, TrashIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useState } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useToast } from "../hooks/useToast";
import { type AdminDnsServerDetail, DnsServerKind } from "../lib/api";

function getKindLabel(kind: DnsServerKind): string {
  switch (kind) {
    case DnsServerKind.CLOUDFLARE:
      return "Cloudflare";
    case DnsServerKind.OVH:
      return "OVH";
    default:
      return kind;
  }
}

function getKindHint(kind: DnsServerKind): string {
  switch (kind) {
    case DnsServerKind.CLOUDFLARE:
      return "Forward + reverse DNS. Token is the Cloudflare bearer token.";
    case DnsServerKind.OVH:
      return 'Reverse DNS (PTR) only. Token is "application_key:application_secret:consumer_key".';
    default:
      return "";
  }
}

export function DnsServersPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selected, setSelected] = useState<AdminDnsServerDetail | null>(null);
  const { success, error: toastError } = useToast();

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const handleEdit = (dns: AdminDnsServerDetail) => {
    setSelected(dns);
    setShowEditModal(true);
  };

  const handleDelete = async (dns: AdminDnsServerDetail) => {
    if (dns.ip_range_count > 0) {
      alert(
        `Cannot delete DNS server "${dns.name}" because it is referenced by ${dns.ip_range_count} IP range(s). Remove the reference from all IP ranges first.`,
      );
      return;
    }
    if (!confirm(`Are you sure you want to delete DNS server "${dns.name}"?`)) return;
    try {
      await adminApi.deleteDnsServer(dns.id);
      success("DNS server deleted");
      refreshData();
    } catch (err) {
      console.error("Failed to delete DNS server:", err);
      toastError(err instanceof Error ? err.message : "Failed to delete DNS server");
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Name</th>
      <th>Kind</th>
      <th>URL</th>
      <th>IP Ranges</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (dns: AdminDnsServerDetail, index: number) => (
    <tr key={dns.id || index}>
      <td className="whitespace-nowrap align-top text-white">{dns.id}</td>
      <td className="align-top">
        <div className="truncate font-medium text-white" title={dns.name}>
          {dns.name}
        </div>
      </td>
      <td className="align-top text-gray-300">{getKindLabel(dns.kind)}</td>
      <td className="align-top text-gray-300">
        <div className="min-w-0 max-w-[18rem]">
          {dns.url ? (
            <span className="truncate font-mono text-xs text-gray-400" title={dns.url}>
              {dns.url}
            </span>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </div>
      </td>
      <td className="align-top text-gray-300 tabular-nums">{dns.ip_range_count}</td>
      <td className="align-top">
        <StatusBadge status={dns.enabled ? "active" : "inactive"} />
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="secondary" onClick={() => handleEdit(dns)} className="p-1">
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(dns)}
            className="text-red-400 hover:text-red-300 p-1"
            disabled={dns.ip_range_count > 0}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <ServerStackIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No DNS servers configured</p>
    </div>
  );

  const calculateStats = (servers: AdminDnsServerDetail[], totalItems: number) => {
    const stats = {
      total: totalItems,
      enabled: servers.filter((s) => s.enabled).length,
    };
    return (
      <StatsHeader
        title="DNS Servers"
        stats={[
          { label: "Total", value: stats.total },
          { label: "Enabled", value: stats.enabled, tone: "success" },
        ]}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add DNS Server
          </Button>
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getDnsServers(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view DNS servers"
        loadingMessage="Loading DNS servers..."
        dependencies={[refreshTrigger]}
        minWidth="900px"
      />

      <CreateDnsServerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refreshData}
      />

      {selected && (
        <EditDnsServerModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelected(null);
          }}
          dnsServer={selected}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

function CreateDnsServerModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    kind: DnsServerKind.CLOUDFLARE,
    url: "",
    token: "",
    enabled: true,
  });

  const resetForm = () => setFormData({ name: "", kind: DnsServerKind.CLOUDFLARE, url: "", token: "", enabled: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminApi.createDnsServer({
        name: formData.name,
        kind: formData.kind,
        url: formData.url || undefined,
        token: formData.token,
        enabled: formData.enabled,
      });
      success("DNS server created");
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      console.error("Failed to create DNS server:", err);
      const msg = err instanceof Error ? err.message : "Failed to create DNS server";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create DNS Server" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className=""
              placeholder="e.g., Cloudflare Primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Kind *</label>
            <select
              value={formData.kind}
              onChange={(e) => setFormData({ ...formData, kind: e.target.value as DnsServerKind })}
              className=""
              required
            >
              <option value={DnsServerKind.CLOUDFLARE}>Cloudflare</option>
              <option value={DnsServerKind.OVH}>OVH</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-gray-400">{getKindHint(formData.kind)}</p>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            API URL {formData.kind === DnsServerKind.OVH ? "*" : "(Optional)"}
          </label>
          <input
            type="text"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="font-mono"
            placeholder={formData.kind === DnsServerKind.OVH ? "https://eu.api.ovh.com" : "API base url"}
            required={formData.kind === DnsServerKind.OVH}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Token *</label>
          <input
            type="password"
            value={formData.token}
            onChange={(e) => setFormData({ ...formData, token: e.target.value })}
            className="font-mono"
            placeholder={
              formData.kind === DnsServerKind.OVH
                ? "application_key:application_secret:consumer_key"
                : "Cloudflare bearer token"
            }
            required
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="dns-enabled"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className=""
          />
          <label htmlFor="dns-enabled" className="ml-2 text-xs text-white">
            Enabled
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create DNS Server"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditDnsServerModal({
  isOpen,
  onClose,
  dnsServer,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  dnsServer: AdminDnsServerDetail;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: dnsServer.name,
    kind: dnsServer.kind,
    url: dnsServer.url,
    token: "",
    enabled: dnsServer.enabled,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updates: Partial<{
        name: string;
        enabled: boolean;
        kind: DnsServerKind;
        url: string;
        token: string;
      }> = {
        name: formData.name,
        kind: formData.kind,
        url: formData.url,
        enabled: formData.enabled,
      };
      // Only send token if the operator entered a new one
      if (formData.token) {
        updates.token = formData.token;
      }
      await adminApi.updateDnsServer(dnsServer.id, updates);
      success("DNS server updated");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update DNS server:", err);
      const msg = err instanceof Error ? err.message : "Failed to update DNS server";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit DNS Server" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className=""
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Kind *</label>
            <select
              value={formData.kind}
              onChange={(e) => setFormData({ ...formData, kind: e.target.value as DnsServerKind })}
              className=""
              required
            >
              <option value={DnsServerKind.CLOUDFLARE}>Cloudflare</option>
              <option value={DnsServerKind.OVH}>OVH</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-gray-400">{getKindHint(formData.kind)}</p>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            API URL {formData.kind === DnsServerKind.OVH ? "*" : "(Optional)"}
          </label>
          <input
            type="text"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="font-mono"
            placeholder={formData.kind === DnsServerKind.OVH ? "https://eu.api.ovh.com" : "API base url"}
            required={formData.kind === DnsServerKind.OVH}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Token</label>
          <input
            type="password"
            value={formData.token}
            onChange={(e) => setFormData({ ...formData, token: e.target.value })}
            className="font-mono"
            placeholder="••••••••"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty to keep the existing token.</p>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="dns-enabled-edit"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className=""
          />
          <label htmlFor="dns-enabled-edit" className="ml-2 text-xs text-white">
            Enabled
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update DNS Server"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
