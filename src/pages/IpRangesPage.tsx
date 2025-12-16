import { useState, useEffect } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import {
  type AdminIpRangeInfo,
  type AdminRegionInfo,
  type AdminAccessPolicyDetail,
  IpRangeAllocationMode,
} from "../lib/api";
import {
  WifiIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

export function IpRangesPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIpRange, setSelectedIpRange] =
    useState<AdminIpRangeInfo | null>(null);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (ipRange: AdminIpRangeInfo) => {
    setSelectedIpRange(ipRange);
    setShowEditModal(true);
  };

  const handleDelete = async (ipRange: AdminIpRangeInfo) => {
    if (ipRange.assignment_count > 0) {
      alert(
        `Cannot delete IP range "${ipRange.cidr}" because it has ${ipRange.assignment_count} active IP assignment(s). Please remove all assignments before deleting.`,
      );
      return;
    }

    if (
      confirm(`Are you sure you want to delete IP range "${ipRange.cidr}"?`)
    ) {
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
      <th>CIDR & Gateway</th>
      <th>Region</th>
      <th>Access Policy</th>
      <th>Allocation</th>
      <th>Assignments</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (ipRange: AdminIpRangeInfo, index: number) => (
    <tr key={ipRange.id || index}>
      <td className="whitespace-nowrap text-white">{ipRange.id}</td>
      <td>
        <div className="space-y-0.5">
          <div className="font-medium text-white font-mono">{ipRange.cidr}</div>
          <div className="text-gray-400 text-sm font-mono">
            Gateway: {ipRange.gateway}
          </div>
          {ipRange.reverse_zone_id && (
            <div className="text-gray-400 text-sm">
              Zone: {ipRange.reverse_zone_id}
            </div>
          )}
        </div>
      </td>
      <td className="text-gray-300">
        <div className="flex items-center">
          <GlobeAltIcon className="h-4 w-4 mr-1 text-gray-400" />
          {ipRange.region_name || `Region ${ipRange.region_id}`}
        </div>
      </td>
      <td className="text-gray-300">
        {ipRange.access_policy_name ? (
          <span className="text-blue-400">{ipRange.access_policy_name}</span>
        ) : (
          <span className="text-gray-500">None</span>
        )}
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="capitalize">{ipRange.allocation_mode}</div>
          {ipRange.use_full_range && (
            <div className="text-xs text-yellow-400">Full Range</div>
          )}
        </div>
      </td>
      <td className="text-gray-300">
        <span className="font-medium">{ipRange.assignment_count}</span>
      </td>
      <td>
        <StatusBadge status={ipRange.enabled ? "active" : "inactive"} />
      </td>
      <td className="text-right">
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEdit(ipRange)}
            className="p-1"
          >
            <PencilIcon className="h-4 w-4" />
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
      totalAssignments: ipRanges.reduce(
        (sum, range) => sum + range.assignment_count,
        0,
      ),
      withPolicies: ipRanges.filter((range) => range.access_policy_id).length,
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IP Ranges</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total:{" "}
              <span className="text-white font-medium">{stats.total}</span>
            </span>
            <span>
              Enabled:{" "}
              <span className="text-green-400 font-medium">
                {stats.enabled}
              </span>
            </span>
            <span>
              With Policies:{" "}
              <span className="text-blue-400 font-medium">
                {stats.withPolicies}
              </span>
            </span>
            <span>
              Assignments:{" "}
              <span className="text-purple-400 font-medium">
                {stats.totalAssignments}
              </span>
            </span>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add IP Range
        </Button>
      </div>
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
        minWidth="1400px"
      />

      {/* Create IP Range Modal */}
      <CreateIpRangeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refreshData}
      />

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
  const [accessPolicies, setAccessPolicies] = useState<
    AdminAccessPolicyDetail[]
  >([]);
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
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [regionsResult, accessPoliciesResult] = await Promise.all([
        adminApi.getRegions(),
        adminApi.getAccessPolicies(),
      ]);
      setRegions(regionsResult.data);
      setAccessPolicies(accessPoliciesResult.data);
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
        access_policy_id: formData.access_policy_id
          ? parseInt(formData.access_policy_id)
          : null,
        allocation_mode: formData.allocation_mode,
        use_full_range: formData.use_full_range,
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
      });
    } catch (err) {
      console.error("Failed to create IP range:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create IP range",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New IP Range"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              CIDR *
            </label>
            <input
              type="text"
              value={formData.cidr}
              onChange={(e) =>
                setFormData({ ...formData, cidr: e.target.value })
              }
              className="font-mono"
              placeholder="192.168.1.0/24"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Gateway *
            </label>
            <input
              type="text"
              value={formData.gateway}
              onChange={(e) =>
                setFormData({ ...formData, gateway: e.target.value })
              }
              className="font-mono"
              placeholder="192.168.1.1"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Region *
            </label>
            <select
              value={formData.region_id}
              onChange={(e) =>
                setFormData({ ...formData, region_id: e.target.value })
              }
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
            {loadingData && (
              <p className="text-xs text-gray-400 mt-1">Loading regions...</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Access Policy (Optional)
            </label>
            <select
              value={formData.access_policy_id}
              onChange={(e) =>
                setFormData({ ...formData, access_policy_id: e.target.value })
              }
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
            <label className="block text-xs font-medium text-white mb-2">
              Allocation Mode
            </label>
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
              <option value={IpRangeAllocationMode.SEQUENTIAL}>
                Sequential
              </option>
              <option value={IpRangeAllocationMode.RANDOM}>Random</option>
              <option value={IpRangeAllocationMode.SLAAC_EUI64}>
                SLAAC EUI-64
              </option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Reverse Zone ID (Optional)
            </label>
            <input
              type="text"
              value={formData.reverse_zone_id}
              onChange={(e) =>
                setFormData({ ...formData, reverse_zone_id: e.target.value })
              }
              className=""
              placeholder="Reverse DNS zone ID"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) =>
                setFormData({ ...formData, enabled: e.target.checked })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, use_full_range: e.target.checked })
              }
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
  const [accessPolicies, setAccessPolicies] = useState<
    AdminAccessPolicyDetail[]
  >([]);
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState({
    cidr: ipRange.cidr,
    gateway: ipRange.gateway,
    enabled: ipRange.enabled,
    region_id: ipRange.region_id.toString(),
    reverse_zone_id: ipRange.reverse_zone_id || "",
    access_policy_id: ipRange.access_policy_id
      ? ipRange.access_policy_id.toString()
      : "",
    allocation_mode: ipRange.allocation_mode,
    use_full_range: ipRange.use_full_range,
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [regionsResult, accessPoliciesResult] = await Promise.all([
        adminApi.getRegions(),
        adminApi.getAccessPolicies(),
      ]);
      setRegions(regionsResult.data);
      setAccessPolicies(accessPoliciesResult.data);
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
        access_policy_id: formData.access_policy_id
          ? parseInt(formData.access_policy_id)
          : null,
        allocation_mode: formData.allocation_mode,
        use_full_range: formData.use_full_range,
      };

      await adminApi.updateIpRange(ipRange.id, updates);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update IP range:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update IP range",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit IP Range" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              CIDR *
            </label>
            <input
              type="text"
              value={formData.cidr}
              onChange={(e) =>
                setFormData({ ...formData, cidr: e.target.value })
              }
              className="font-mono"
              placeholder="192.168.1.0/24"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Gateway *
            </label>
            <input
              type="text"
              value={formData.gateway}
              onChange={(e) =>
                setFormData({ ...formData, gateway: e.target.value })
              }
              className="font-mono"
              placeholder="192.168.1.1"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Region *
            </label>
            <select
              value={formData.region_id}
              onChange={(e) =>
                setFormData({ ...formData, region_id: e.target.value })
              }
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
            {loadingData && (
              <p className="text-xs text-gray-400 mt-1">Loading regions...</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Access Policy (Optional)
            </label>
            <select
              value={formData.access_policy_id}
              onChange={(e) =>
                setFormData({ ...formData, access_policy_id: e.target.value })
              }
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
            <label className="block text-xs font-medium text-white mb-2">
              Allocation Mode
            </label>
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
              <option value={IpRangeAllocationMode.SEQUENTIAL}>
                Sequential
              </option>
              <option value={IpRangeAllocationMode.RANDOM}>Random</option>
              <option value={IpRangeAllocationMode.SLAAC_EUI64}>
                SLAAC EUI-64
              </option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Reverse Zone ID (Optional)
            </label>
            <input
              type="text"
              value={formData.reverse_zone_id}
              onChange={(e) =>
                setFormData({ ...formData, reverse_zone_id: e.target.value })
              }
              className=""
              placeholder="Reverse DNS zone ID"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled-edit"
              checked={formData.enabled}
              onChange={(e) =>
                setFormData({ ...formData, enabled: e.target.checked })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, use_full_range: e.target.checked })
              }
              className=""
            />
            <label
              htmlFor="use_full_range-edit"
              className="ml-2 text-xs text-white"
            >
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
