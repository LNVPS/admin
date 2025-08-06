import { useState, useEffect } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { Profile } from "../components/Profile";
import { Button } from "../components/Button";
import {
  AdminVmInfo,
  VmState,
  AdminRegionInfo,
  AdminHostInfo,
} from "../lib/api";
import { formatBytes } from "../utils/formatBytes";
import {
  PlayIcon,
  StopIcon,
  TrashIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export function VMsPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [regions, setRegions] = useState<AdminRegionInfo[]>([]);
  const [hosts, setHosts] = useState<AdminHostInfo[]>([]);
  const [filters, setFilters] = useState({
    user_id: "",
    host_id: "",
    pubkey: "",
    region_id: "",
    include_deleted: false,
  });

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [regionsResponse, hostsResponse] = await Promise.all([
          adminApi.getRegions({ limit: 100 }),
          adminApi.getHosts({ limit: 100 }),
        ]);
        setRegions(regionsResponse.data);
        setHosts(hostsResponse.data);
      } catch (error) {
        console.error("Failed to load filter data:", error);
      }
    };
    loadFilterData();
  }, [adminApi]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      user_id: "",
      host_id: "",
      pubkey: "",
      region_id: "",
      include_deleted: false,
    });
    setRefreshTrigger((prev) => prev + 1);
  };

  const getApiFilters = () => {
    const apiFilters: any = {};

    if (filters.user_id && !isNaN(Number(filters.user_id))) {
      apiFilters.user_id = Number(filters.user_id);
    }
    if (filters.host_id && !isNaN(Number(filters.host_id))) {
      apiFilters.host_id = Number(filters.host_id);
    }
    if (filters.pubkey.trim()) {
      apiFilters.pubkey = filters.pubkey.trim();
    }
    if (filters.region_id && !isNaN(Number(filters.region_id))) {
      apiFilters.region_id = Number(filters.region_id);
    }
    if (filters.include_deleted) {
      apiFilters.include_deleted = true;
    }

    return apiFilters;
  };

  const handleStartVM = async (vm: AdminVmInfo) => {
    try {
      await adminApi.startVM(vm.id);
      refreshData();
    } catch (error) {
      console.error("Failed to start VM:", error);
    }
  };

  const handleStopVM = async (vm: AdminVmInfo) => {
    try {
      await adminApi.stopVM(vm.id);
      refreshData();
    } catch (error) {
      console.error("Failed to stop VM:", error);
    }
  };

  const handleDeleteVM = async (vm: AdminVmInfo) => {
    if (confirm(`Are you sure you want to delete VM ${vm.id}?`)) {
      try {
        await adminApi.deleteVM(vm.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete VM:", error);
      }
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>VM Details</th>
      <th>Status & Resources</th>
      <th>Network</th>
      <th>Owner</th>
      <th>Dates</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (vmInfo: AdminVmInfo, index: number) => (
    <tr key={vmInfo.id || index}>
      <td className="whitespace-nowrap text-white">{vmInfo.id}</td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="font-medium">{vmInfo.image_name}</div>
          <div className="text-blue-400">{vmInfo.template_name}</div>
        </div>
      </td>
      <td>
        <div className="space-y-1">
          <StatusBadge
            status={
              vmInfo.status === VmState.RUNNING
                ? "running"
                : vmInfo.status === VmState.STOPPED
                  ? "stopped"
                  : "unknown"
            }
          >
            {vmInfo.status}
          </StatusBadge>
          {vmInfo.cpu !== undefined &&
          vmInfo.memory !== undefined &&
          vmInfo.disk_size !== undefined ? (
            <div className="text-sm font-mono text-gray-300">
              {vmInfo.cpu}C · {formatBytes(vmInfo.memory)} ·{" "}
              {formatBytes(vmInfo.disk_size)}{" "}
              <span className="text-gray-400 uppercase">
                {vmInfo.disk_type}
              </span>
            </div>
          ) : (
            <div className="text-gray-500 text-xs">No resource info</div>
          )}
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          {vmInfo.ip_addresses.length > 0 ? (
            vmInfo.ip_addresses.map((ip, idx) => (
              <div key={idx}>
                <span className="font-mono">{ip.ip}</span>
              </div>
            ))
          ) : (
            <span className="text-gray-400">No IPs</span>
          )}
          <div className="text-gray-400">{vmInfo.region_name || "Unknown"}</div>
        </div>
      </td>
      <td>
        {vmInfo.user_pubkey ? (
          <Profile pubkey={vmInfo.user_pubkey} avatarSize="sm" />
        ) : (
          <span className="text-gray-400">N/A</span>
        )}
      </td>
      <td>
        <div className="space-y-0.5">
          <div className="text-gray-400">
            {new Date(vmInfo.created).toLocaleDateString()}
          </div>
          <div className="text-gray-500">
            Exp: {new Date(vmInfo.expires).toLocaleDateString()}
          </div>
        </div>
      </td>
      <td className="text-right">
        <div className="flex justify-end space-x-2">
          {vmInfo.status === VmState.STOPPED && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleStartVM(vmInfo)}
              className="p-1 text-green-400 hover:text-green-300"
            >
              <PlayIcon className="h-4 w-4" />
            </Button>
          )}
          {vmInfo.status === VmState.RUNNING && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleStopVM(vmInfo)}
              className="p-1 text-yellow-400 hover:text-yellow-300"
            >
              <StopIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDeleteVM(vmInfo)}
            className="p-1 text-red-400 hover:text-red-300"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.user_id) count++;
    if (filters.host_id) count++;
    if (filters.pubkey.trim()) count++;
    if (filters.region_id) count++;
    if (filters.include_deleted) count++;
    return count;
  };

  const calculateStats = (vms: AdminVmInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      running: vms.filter((vm) => vm.status === VmState.RUNNING).length,
      stopped: vms.filter((vm) => vm.status === VmState.STOPPED).length,
    };

    const activeFilters = getActiveFilterCount();

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Virtual Machines</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total:{" "}
              <span className="text-white font-medium">{stats.total}</span>
            </span>
            <span>
              Running:{" "}
              <span className="text-green-400 font-medium">
                {stats.running}
              </span>
            </span>
            <span>
              Stopped:{" "}
              <span className="text-red-400 font-medium">{stats.stopped}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Filters</h3>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(false)}
              className="p-1"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                User ID
              </label>
              <input
                type="number"
                value={filters.user_id}
                onChange={(e) => handleFilterChange("user_id", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter user ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Host
              </label>
              <select
                value={filters.host_id}
                onChange={(e) => handleFilterChange("host_id", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All hosts</option>
                {hosts.map((host) => (
                  <option key={host.id} value={host.id}>
                    {host.name} ({host.region.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Region
              </label>
              <select
                value={filters.region_id}
                onChange={(e) =>
                  handleFilterChange("region_id", e.target.value)
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All regions</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Public Key
              </label>
              <input
                type="text"
                value={filters.pubkey}
                onChange={(e) => handleFilterChange("pubkey", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter public key (hex format)"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="include_deleted"
                checked={filters.include_deleted}
                onChange={(e) =>
                  handleFilterChange("include_deleted", e.target.checked)
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="include_deleted"
                className="ml-2 text-sm text-gray-300"
              >
                Include deleted VMs
              </label>
            </div>

            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={clearFilters}
                className="w-full"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      <PaginatedTable
        apiCall={(params) => adminApi.getVMs({ ...params, ...getApiFilters() })}
        renderHeader={renderHeader}
        renderRow={renderRow}
        calculateStats={calculateStats}
        itemsPerPage={15}
        errorAction="view virtual machines"
        loadingMessage="Loading virtual machines..."
        dependencies={[refreshTrigger, filters]}
        minWidth="1200px"
      />
    </div>
  );
}
