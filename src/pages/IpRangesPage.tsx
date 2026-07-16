import {
  ArrowPathIcon,
  EyeIcon,
  GlobeAltIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useToast } from "../hooks/useToast";
import {
  type AdminAccessPolicyDetail,
  type AdminDnsServerDetail,
  type AdminDnsZone,
  type AdminIpRangeInfo,
  type AdminRegionInfo,
  IpRangeAllocationMode,
} from "../lib/api";

export function IpRangesPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFreeIpsModal, setShowFreeIpsModal] = useState(false);
  const [selectedIpRange, setSelectedIpRange] = useState<AdminIpRangeInfo | null>(null);
  const [patchingId, setPatchingId] = useState<number | null>(null);
  const { success, error: toastError } = useToast();

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handlePatchDns = async (ipRange: AdminIpRangeInfo) => {
    if (
      !confirm(
        `Re-apply forward + reverse DNS for all ${ipRange.assignment_count} assignment(s) in "${ipRange.cidr}"? This queues a background job.`,
      )
    ) {
      return;
    }
    setPatchingId(ipRange.id);
    try {
      await adminApi.patchIpRangeDns(ipRange.id);
      success(`DNS patch job queued for ${ipRange.cidr}`);
    } catch (err) {
      console.error("Failed to queue DNS patch:", err);
      toastError(err instanceof Error ? err.message : "Failed to queue DNS patch");
    } finally {
      setPatchingId(null);
    }
  };

  const handleEdit = (ipRange: AdminIpRangeInfo) => {
    setSelectedIpRange(ipRange);
    setShowEditModal(true);
  };

  const handleViewFreeIps = (ipRange: AdminIpRangeInfo) => {
    setSelectedIpRange(ipRange);
    setShowFreeIpsModal(true);
  };

  const handleDelete = async (ipRange: AdminIpRangeInfo) => {
    if (ipRange.assignment_count > 0) {
      alert(
        `Cannot delete IP range "${ipRange.cidr}" because it has ${ipRange.assignment_count} active IP assignment(s). Please remove all assignments before deleting.`,
      );
      return;
    }

    if (confirm(`Are you sure you want to delete IP range "${ipRange.cidr}"?`)) {
      try {
        await adminApi.deleteIpRange(ipRange.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete IP range:", error);
      }
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>CIDR &amp; Gateway</th>
      <th>Region &amp; Policy</th>
      <th>Allocation</th>
      <th>Assigned (Free)</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (ipRange: AdminIpRangeInfo, index: number) => (
    <tr key={ipRange.id || index}>
      <td className="whitespace-nowrap align-top text-white">{ipRange.id}</td>
      <td className="align-top">
        <div className="min-w-0 max-w-[18rem]">
          <div className="truncate font-mono font-medium text-white" title={ipRange.cidr}>
            {ipRange.cidr}
          </div>
          <div className="mt-0.5 truncate font-mono text-xs text-gray-400" title={ipRange.gateway}>
            gw {ipRange.gateway}
          </div>
          {ipRange.reverse_zone_id && (
            <div className="mt-0.5 truncate text-xs text-gray-400" title={ipRange.reverse_zone_id}>
              Zone: {ipRange.reverse_zone_id}
            </div>
          )}
        </div>
      </td>
      <td className="align-top text-gray-300">
        <div className="min-w-0 max-w-[14rem]">
          <div className="flex items-center">
            <GlobeAltIcon className="h-4 w-4 mr-1 shrink-0 text-gray-400" />
            <span className="truncate" title={ipRange.region_name || `Region ${ipRange.region_id}`}>
              {ipRange.region_name || `Region ${ipRange.region_id}`}
            </span>
          </div>
          <div className="mt-0.5 truncate text-xs">
            {ipRange.access_policy_name ? (
              <span className="text-blue-400">{ipRange.access_policy_name}</span>
            ) : (
              <span className="text-gray-500">No policy</span>
            )}
          </div>
          {ipRange.routers && ipRange.routers.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {ipRange.routers.map((router) => (
                <Link
                  key={router.id}
                  to={`/routers/${router.id}`}
                  className="inline-flex max-w-full items-center gap-1 rounded border border-slate-600/70 bg-slate-700/40 px-1.5 py-0.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                  title={`Router: ${router.name}`}
                >
                  <WifiIcon className="h-3 w-3 shrink-0 text-gray-400" />
                  <span className="truncate">{router.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="align-top text-gray-300">
        <div className="space-y-0.5">
          <div className="capitalize">{ipRange.allocation_mode}</div>
          {ipRange.use_full_range && <div className="text-xs text-yellow-400">Full Range</div>}
        </div>
      </td>
      <td className="align-top text-gray-300">
        <span className="font-medium">
          {ipRange.assignment_count}
          {ipRange.available_ips !== undefined && <> ({ipRange.available_ips})</>}
        </span>
      </td>
      <td className="align-top">
        <StatusBadge status={ipRange.enabled ? "active" : "inactive"} />
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleViewFreeIps(ipRange)}
            className="p-1"
            title="View free IPs"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleEdit(ipRange)} className="p-1">
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handlePatchDns(ipRange)}
            className="p-1"
            title="Re-apply DNS for all assignments"
            disabled={patchingId === ipRange.id}
          >
            <ArrowPathIcon className={`h-4 w-4 ${patchingId === ipRange.id ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(ipRange)}
            className="text-red-400 hover:text-red-300 p-1"
            disabled={ipRange.assignment_count > 0}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <WifiIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No IP ranges found</p>
    </div>
  );

  const calculateStats = (ipRanges: AdminIpRangeInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      enabled: ipRanges.filter((range) => range.enabled).length,
    };

    return (
      <StatsHeader
        title="IP Ranges"
        stats={[
          { label: "Total", value: stats.total },
          { label: "Enabled", value: stats.enabled, tone: "success" },
        ]}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add IP Range
          </Button>
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getIpRanges(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view IP ranges"
        loadingMessage="Loading IP ranges..."
        dependencies={[refreshTrigger]}
        minWidth="900px"
      />

      {/* Create IP Range Modal */}
      <CreateIpRangeModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={refreshData} />

      {/* Edit IP Range Modal */}
      {selectedIpRange && (
        <EditIpRangeModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedIpRange(null);
          }}
          ipRange={selectedIpRange}
          onSuccess={refreshData}
        />
      )}

      {/* Free IPs Modal */}
      {selectedIpRange && (
        <FreeIpsModal
          isOpen={showFreeIpsModal}
          onClose={() => {
            setShowFreeIpsModal(false);
            setSelectedIpRange(null);
          }}
          ipRange={selectedIpRange}
        />
      )}
    </div>
  );
}

// Zone select populated from the zones available on the selected DNS server
function ZoneSelect({
  label,
  dnsServerId,
  value,
  onChange,
}: {
  label: string;
  dnsServerId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const adminApi = useAdminApi();
  const [zones, setZones] = useState<AdminDnsZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dnsServerId) {
      setZones([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminApi
      .getDnsServerZones(parseInt(dnsServerId))
      .then((data) => {
        if (!cancelled) setZones(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to fetch DNS zones:", err);
          setError("Failed to load zones");
          setZones([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dnsServerId, adminApi]);

  const hasCurrentValue = value !== "" && !zones.some((zone) => zone.id === value);

  return (
    <div>
      <label className="block text-xs font-medium text-white mb-2">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="" disabled={!dnsServerId || loading}>
        <option value="">{!dnsServerId ? "Select a DNS server first" : loading ? "Loading zones..." : "None"}</option>
        {hasCurrentValue && <option value={value}>{value}</option>}
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name} ({zone.id})
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// Create IP Range Modal Component
function CreateIpRangeModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regions, setRegions] = useState<AdminRegionInfo[]>([]);
  const [accessPolicies, setAccessPolicies] = useState<AdminAccessPolicyDetail[]>([]);
  const [dnsServers, setDnsServers] = useState<AdminDnsServerDetail[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState({
    cidr: "",
    gateway: "",
    enabled: true,
    region_id: "",
    reverse_zone_id: "",
    access_policy_id: "",
    allocation_mode: IpRangeAllocationMode.SEQUENTIAL,
    use_full_range: false,
    forward_dns_server_id: "",
    reverse_dns_server_id: "",
    forward_zone_id: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [regionsResult, accessPoliciesResult, dnsServersResult] = await Promise.all([
        adminApi.getRegions(),
        adminApi.getAccessPolicies(),
        adminApi.getDnsServers({ limit: 100 }),
      ]);
      setRegions(regionsResult.data);
      setAccessPolicies(accessPoliciesResult.data);
      setDnsServers(dnsServersResult.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        cidr: formData.cidr,
        gateway: formData.gateway,
        enabled: formData.enabled,
        region_id: parseInt(formData.region_id),
        reverse_zone_id: formData.reverse_zone_id || null,
        access_policy_id: formData.access_policy_id ? parseInt(formData.access_policy_id) : null,
        allocation_mode: formData.allocation_mode,
        use_full_range: formData.use_full_range,
        forward_dns_server_id: formData.forward_dns_server_id ? parseInt(formData.forward_dns_server_id) : null,
        reverse_dns_server_id: formData.reverse_dns_server_id ? parseInt(formData.reverse_dns_server_id) : null,
        forward_zone_id: formData.forward_zone_id || null,
      };

      await adminApi.createIpRange(data);
      onSuccess();
      onClose();
      setFormData({
        cidr: "",
        gateway: "",
        enabled: true,
        region_id: "",
        reverse_zone_id: "",
        access_policy_id: "",
        allocation_mode: IpRangeAllocationMode.SEQUENTIAL,
        use_full_range: false,
        forward_dns_server_id: "",
        reverse_dns_server_id: "",
        forward_zone_id: "",
      });
    } catch (err) {
      console.error("Failed to create IP range:", err);
      setError(err instanceof Error ? err.message : "Failed to create IP range");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New IP Range" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">CIDR *</label>
            <input
              type="text"
              value={formData.cidr}
              onChange={(e) => setFormData({ ...formData, cidr: e.target.value })}
              className="font-mono"
              placeholder="192.168.1.0/24"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Gateway *</label>
            <input
              type="text"
              value={formData.gateway}
              onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
              className="font-mono"
              placeholder="192.168.1.1"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Region *</label>
            <select
              value={formData.region_id}
              onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
              className=""
              disabled={loadingData}
              required
            >
              <option value="">Select a region...</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id.toString()}>
                  {region.name} {!region.enabled && "(DISABLED)"}
                </option>
              ))}
            </select>
            {loadingData && <p className="text-xs text-gray-400 mt-1">Loading regions...</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Access Policy (Optional)</label>
            <select
              value={formData.access_policy_id}
              onChange={(e) => setFormData({ ...formData, access_policy_id: e.target.value })}
              className=""
              disabled={loadingData}
            >
              <option value="">Select access policy...</option>
              {accessPolicies.map((policy) => (
                <option key={policy.id} value={policy.id.toString()}>
                  {policy.name} ({policy.kind})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Allocation Mode</label>
            <select
              value={formData.allocation_mode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  allocation_mode: e.target.value as IpRangeAllocationMode,
                })
              }
              className=""
            >
              <option value={IpRangeAllocationMode.SEQUENTIAL}>Sequential</option>
              <option value={IpRangeAllocationMode.RANDOM}>Random</option>
              <option value={IpRangeAllocationMode.SLAAC_EUI64}>SLAAC EUI-64</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium text-white mb-1">DNS (Optional)</h3>
          <p className="text-xs text-gray-400 mb-3">
            Select which DNS provider manages forward (A/AAAA) and reverse (PTR) records for this range.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">Forward DNS Server</label>
              <select
                value={formData.forward_dns_server_id}
                onChange={(e) => setFormData({ ...formData, forward_dns_server_id: e.target.value })}
                className=""
                disabled={loadingData}
              >
                <option value="">None</option>
                {dnsServers.map((dns) => (
                  <option key={dns.id} value={dns.id.toString()}>
                    {dns.name} ({dns.kind})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">Reverse DNS Server</label>
              <select
                value={formData.reverse_dns_server_id}
                onChange={(e) => setFormData({ ...formData, reverse_dns_server_id: e.target.value })}
                className=""
                disabled={loadingData}
              >
                <option value="">None</option>
                {dnsServers.map((dns) => (
                  <option key={dns.id} value={dns.id.toString()}>
                    {dns.name} ({dns.kind})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <ZoneSelect
              label="Forward Zone ID (Optional)"
              dnsServerId={formData.forward_dns_server_id}
              value={formData.forward_zone_id}
              onChange={(value) => setFormData({ ...formData, forward_zone_id: value })}
            />
            <ZoneSelect
              label="Reverse Zone ID (Optional)"
              dnsServerId={formData.reverse_dns_server_id}
              value={formData.reverse_zone_id}
              onChange={(value) => setFormData({ ...formData, reverse_zone_id: value })}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className=""
            />
            <label htmlFor="enabled" className="ml-2 text-xs text-white">
              Enabled
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="use_full_range"
              checked={formData.use_full_range}
              onChange={(e) => setFormData({ ...formData, use_full_range: e.target.checked })}
              className=""
            />
            <label htmlFor="use_full_range" className="ml-2 text-xs text-white">
              Use Full Range
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || loadingData}>
            {loading ? "Creating..." : "Create IP Range"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit IP Range Modal Component
function EditIpRangeModal({
  isOpen,
  onClose,
  ipRange,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  ipRange: AdminIpRangeInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regions, setRegions] = useState<AdminRegionInfo[]>([]);
  const [accessPolicies, setAccessPolicies] = useState<AdminAccessPolicyDetail[]>([]);
  const [dnsServers, setDnsServers] = useState<AdminDnsServerDetail[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState({
    cidr: ipRange.cidr,
    gateway: ipRange.gateway,
    enabled: ipRange.enabled,
    region_id: ipRange.region_id.toString(),
    reverse_zone_id: ipRange.reverse_zone_id || "",
    access_policy_id: ipRange.access_policy_id ? ipRange.access_policy_id.toString() : "",
    allocation_mode: ipRange.allocation_mode,
    use_full_range: ipRange.use_full_range,
    forward_dns_server_id: ipRange.forward_dns_server_id ? ipRange.forward_dns_server_id.toString() : "",
    reverse_dns_server_id: ipRange.reverse_dns_server_id ? ipRange.reverse_dns_server_id.toString() : "",
    forward_zone_id: ipRange.forward_zone_id || "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [regionsResult, accessPoliciesResult, dnsServersResult] = await Promise.all([
        adminApi.getRegions(),
        adminApi.getAccessPolicies(),
        adminApi.getDnsServers({ limit: 100 }),
      ]);
      setRegions(regionsResult.data);
      setAccessPolicies(accessPoliciesResult.data);
      setDnsServers(dnsServersResult.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updates = {
        cidr: formData.cidr,
        gateway: formData.gateway,
        enabled: formData.enabled,
        region_id: parseInt(formData.region_id),
        reverse_zone_id: formData.reverse_zone_id || null,
        access_policy_id: formData.access_policy_id ? parseInt(formData.access_policy_id) : null,
        allocation_mode: formData.allocation_mode,
        use_full_range: formData.use_full_range,
        forward_dns_server_id: formData.forward_dns_server_id ? parseInt(formData.forward_dns_server_id) : null,
        reverse_dns_server_id: formData.reverse_dns_server_id ? parseInt(formData.reverse_dns_server_id) : null,
        forward_zone_id: formData.forward_zone_id || null,
      };

      await adminApi.updateIpRange(ipRange.id, updates);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update IP range:", err);
      setError(err instanceof Error ? err.message : "Failed to update IP range");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit IP Range" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">CIDR *</label>
            <input
              type="text"
              value={formData.cidr}
              onChange={(e) => setFormData({ ...formData, cidr: e.target.value })}
              className="font-mono"
              placeholder="192.168.1.0/24"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Gateway *</label>
            <input
              type="text"
              value={formData.gateway}
              onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
              className="font-mono"
              placeholder="192.168.1.1"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Region *</label>
            <select
              value={formData.region_id}
              onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
              className=""
              disabled={loadingData}
              required
            >
              <option value="">Select a region...</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id.toString()}>
                  {region.name} {!region.enabled && "(DISABLED)"}
                </option>
              ))}
            </select>
            {loadingData && <p className="text-xs text-gray-400 mt-1">Loading regions...</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Access Policy (Optional)</label>
            <select
              value={formData.access_policy_id}
              onChange={(e) => setFormData({ ...formData, access_policy_id: e.target.value })}
              className=""
              disabled={loadingData}
            >
              <option value="">Select access policy...</option>
              {accessPolicies.map((policy) => (
                <option key={policy.id} value={policy.id.toString()}>
                  {policy.name} ({policy.kind})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Allocation Mode</label>
            <select
              value={formData.allocation_mode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  allocation_mode: e.target.value as IpRangeAllocationMode,
                })
              }
              className=""
            >
              <option value={IpRangeAllocationMode.SEQUENTIAL}>Sequential</option>
              <option value={IpRangeAllocationMode.RANDOM}>Random</option>
              <option value={IpRangeAllocationMode.SLAAC_EUI64}>SLAAC EUI-64</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium text-white mb-1">DNS (Optional)</h3>
          <p className="text-xs text-gray-400 mb-3">
            Select which DNS provider manages forward (A/AAAA) and reverse (PTR) records for this range. Use the Patch
            DNS action on the list to re-apply records after changing these.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">Forward DNS Server</label>
              <select
                value={formData.forward_dns_server_id}
                onChange={(e) => setFormData({ ...formData, forward_dns_server_id: e.target.value })}
                className=""
                disabled={loadingData}
              >
                <option value="">None</option>
                {dnsServers.map((dns) => (
                  <option key={dns.id} value={dns.id.toString()}>
                    {dns.name} ({dns.kind})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">Reverse DNS Server</label>
              <select
                value={formData.reverse_dns_server_id}
                onChange={(e) => setFormData({ ...formData, reverse_dns_server_id: e.target.value })}
                className=""
                disabled={loadingData}
              >
                <option value="">None</option>
                {dnsServers.map((dns) => (
                  <option key={dns.id} value={dns.id.toString()}>
                    {dns.name} ({dns.kind})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <ZoneSelect
              label="Forward Zone ID (Optional)"
              dnsServerId={formData.forward_dns_server_id}
              value={formData.forward_zone_id}
              onChange={(value) => setFormData({ ...formData, forward_zone_id: value })}
            />
            <ZoneSelect
              label="Reverse Zone ID (Optional)"
              dnsServerId={formData.reverse_dns_server_id}
              value={formData.reverse_zone_id}
              onChange={(value) => setFormData({ ...formData, reverse_zone_id: value })}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled-edit"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className=""
            />
            <label htmlFor="enabled-edit" className="ml-2 text-xs text-white">
              Enabled
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="use_full_range-edit"
              checked={formData.use_full_range}
              onChange={(e) => setFormData({ ...formData, use_full_range: e.target.checked })}
              className=""
            />
            <label htmlFor="use_full_range-edit" className="ml-2 text-xs text-white">
              Use Full Range
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || loadingData}>
            {loading ? "Updating..." : "Update IP Range"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Free IPs Modal Component
function FreeIpsModal({
  isOpen,
  onClose,
  ipRange,
}: {
  isOpen: boolean;
  onClose: () => void;
  ipRange: AdminIpRangeInfo;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freeIps, setFreeIps] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchFreeIps();
    }
  }, [isOpen, ipRange.id]);

  const fetchFreeIps = async () => {
    setLoading(true);
    setError(null);
    try {
      const ips = await adminApi.getFreeIps(ipRange.id);
      setFreeIps(ips);
    } catch (err) {
      console.error("Failed to fetch free IPs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch free IPs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Free IPs in ${ipRange.cidr}`} size="lg">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading free IPs...</div>
        ) : freeIps.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <WifiIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No free IPs available in this range</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-400 mb-2">
              Found <span className="text-white font-medium">{freeIps.length}</span> free IP address(es). Click an IP to
              view assignment history.
            </div>
            <div className="max-h-96 overflow-y-auto bg-slate-800 rounded-lg p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {freeIps.map((ip, index) => (
                  <Link
                    key={index}
                    to={`/ip-address/${encodeURIComponent(ip)}`}
                    className="font-mono text-xs px-2 py-1 rounded transition-colors truncate text-center block bg-slate-700 text-green-400 hover:bg-slate-600"
                    title={ip}
                  >
                    {ip}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
