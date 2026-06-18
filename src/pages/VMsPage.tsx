import { EyeIcon, FunnelIcon, PlayIcon, PlusIcon, StopIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { bech32ToHex } from "@snort/shared";
import { tryParseNostrLink } from "@snort/system";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { CreateVmModal } from "../components/CreateVmModal";
import { PaginatedTable } from "../components/PaginatedTable";
import { Profile } from "../components/Profile";
import { StatusBadge } from "../components/StatusBadge";
import { getVmStatus, VmStatusBadge } from "../components/VmStatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { type AdminHostInfo, type AdminRegionInfo, type AdminVmInfo, VmRunningStates } from "../lib/api";
import { formatBytes } from "../utils/formatBytes";

export function VMsPage() {
  const adminApi = useAdminApi();
  const navigate = useNavigate();
  const [vmIdInput, setVmIdInput] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateVmModal, setShowCreateVmModal] = useState(false);
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

  const handleVmCreated = (jobId: string) => {
    console.log("VM creation job dispatched:", jobId);
    refreshData();
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

  const parsePubkey = (pubkey: string): string => {
    const trimmedPubkey = pubkey.trim();
    if (!trimmedPubkey) return "";

    try {
      if (trimmedPubkey.startsWith("npub1") || trimmedPubkey.startsWith("nprofile1")) {
        const link = tryParseNostrLink(trimmedPubkey);
        if (link) {
          return link.id;
        } else {
          return bech32ToHex(trimmedPubkey);
        }
      }
    } catch (error) {
      console.debug("Failed to parse nostr identifier:", error);
    }

    return trimmedPubkey;
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
      apiFilters.pubkey = parsePubkey(filters.pubkey);
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

  const renderHeader = () => (
    <>
      <th className="w-14">ID</th>
      <th>Host &amp; Network</th>
      <th>Status</th>
      <th>Owner</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (vmInfo: AdminVmInfo, index: number) => (
    <tr key={vmInfo.id || index} className={vmInfo.deleted ? "bg-gray-800/50 opacity-75" : ""}>
      <td className="whitespace-nowrap align-top">
        <Link to={`/vms/${vmInfo.id}`} className="text-blue-400 hover:text-blue-300 font-semibold">
          #{vmInfo.id}
        </Link>
      </td>
      {/* Host · region / IPs */}
      <td className="align-top">
        <div className="min-w-0 max-w-[22rem]">
          <div className="truncate text-slate-100">
            {vmInfo.host_name && <span className="font-medium">{vmInfo.host_name}</span>}
            {vmInfo.host_name && <span className="text-slate-500"> · </span>}
            <span className="text-slate-400">{vmInfo.region_name || "Unknown region"}</span>
          </div>
          <div className="mt-1 space-y-0.5">
            {vmInfo.ip_addresses.length > 0 ? (
              vmInfo.ip_addresses.map((ip, idx) => (
                <div key={idx} className="truncate font-mono text-xs text-slate-300" title={ip.ip}>
                  {ip.ip}
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-500">No IPs</span>
            )}
          </div>
        </div>
      </td>
      {/* Status + resources */}
      <td className="align-top">
        <div className="flex flex-wrap items-center gap-1.5">
          <VmStatusBadge vm={vmInfo} />
          {(vmInfo as { disabled?: boolean }).disabled && <StatusBadge status="disabled" />}
        </div>
        {vmInfo.cpu !== undefined && vmInfo.memory !== undefined && vmInfo.disk_size !== undefined ? (
          <div className="mt-1.5 font-mono text-xs text-slate-300">
            {vmInfo.cpu}C · {formatBytes(vmInfo.memory)} · {formatBytes(vmInfo.disk_size)}{" "}
            <span className="uppercase text-slate-500">{vmInfo.disk_type}</span>
          </div>
        ) : (
          <div className="mt-1.5 text-xs text-slate-500">No resource info</div>
        )}
      </td>
      {/* Owner + dates */}
      <td className="align-top">
        {vmInfo.user_id ? (
          <Link
            to={`/users/${vmInfo.user_id}`}
            className="text-blue-400 hover:text-blue-300"
            state={{ user: undefined }}
          >
            <Profile pubkey={vmInfo.user_pubkey || ""} avatarSize="sm" />
          </Link>
        ) : (
          <span className="text-slate-400">N/A</span>
        )}
        <div className="mt-1 text-xs text-slate-400">
          Created {new Date(vmInfo.created).toLocaleDateString()}
          {vmInfo.expires && new Date(vmInfo.expires) < new Date() && (
            <span className="ml-2 font-semibold text-red-400">Expired</span>
          )}
        </div>
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end space-x-2">
          <Link to={`/vms/${vmInfo.id}`}>
            <Button size="sm" variant="secondary" className="p-1 text-blue-400 hover:text-blue-300">
              <EyeIcon className="h-4 w-4" />
            </Button>
          </Link>
          {!vmInfo.deleted && getVmStatus(vmInfo) !== "new" && getVmStatus(vmInfo) === VmRunningStates.STOPPED && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleStartVM(vmInfo)}
              className="p-1 text-green-400 hover:text-green-300"
            >
              <PlayIcon className="h-4 w-4" />
            </Button>
          )}
          {!vmInfo.deleted && getVmStatus(vmInfo) !== "new" && getVmStatus(vmInfo) === VmRunningStates.RUNNING && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleStopVM(vmInfo)}
              className="p-1 text-yellow-400 hover:text-yellow-300"
            >
              <StopIcon className="h-4 w-4" />
            </Button>
          )}
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
      running: vms.filter((vm) => getVmStatus(vm) === VmRunningStates.RUNNING).length,
      stopped: vms.filter((vm) => getVmStatus(vm) === VmRunningStates.STOPPED).length,
      new: vms.filter((vm) => getVmStatus(vm) === "new").length,
      deleted: vms.filter((vm) => vm.deleted).length,
    };

    const activeFilters = getActiveFilterCount();

    const statCells = [
      { label: "Total", value: stats.total, text: "text-cyan-400", dot: "bg-cyan-400" },
      { label: "Running", value: stats.running, text: "text-green-400", dot: "bg-green-400" },
      { label: "Stopped", value: stats.stopped, text: "text-red-400", dot: "bg-red-500" },
      { label: "New / pending", value: stats.new, text: "text-yellow-400", dot: "bg-yellow-400" },
    ];
    if (filters.include_deleted) {
      statCells.push({ label: "Deleted", value: stats.deleted, text: "text-slate-400", dot: "bg-slate-500" });
    }

    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Virtual Machines</h1>
            <p className="mt-2 text-sm text-slate-400">
              {stats.total} instances across {regions.length || "—"} regions · {stats.running} running
            </p>
          </div>
          <div className="flex items-center space-x-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const id = vmIdInput.trim();
              if (id && !isNaN(Number(id))) {
                navigate(`/vms/${id}`);
                setVmIdInput("");
              }
            }}
            className="flex items-center space-x-1"
          >
            <input
              type="number"
              value={vmIdInput}
              onChange={(e) => setVmIdInput(e.target.value)}
              placeholder="Go to VM ID"
              className="w-32 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <Button variant="secondary" type="submit" disabled={!vmIdInput.trim()}>
              Go
            </Button>
          </form>
          <Button variant="primary" onClick={() => setShowCreateVmModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create VM
          </Button>
          <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} className="relative">
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-slate-950 font-semibold text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-lg border border-slate-700 bg-slate-700">
          {statCells.map((cell) => (
            <div key={cell.label} className="bg-slate-800 px-5 py-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full ${cell.dot}`} />
                {cell.label}
              </div>
              <div className={`font-display mt-2 text-3xl font-extrabold ${cell.text}`}>{cell.value}</div>
            </div>
          ))}
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
            <Button variant="secondary" onClick={() => setShowFilters(false)} className="p-1">
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">User ID</label>
              <input
                type="number"
                value={filters.user_id}
                onChange={(e) => handleFilterChange("user_id", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter user ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Host</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Region</label>
              <select
                value={filters.region_id}
                onChange={(e) => handleFilterChange("region_id", e.target.value)}
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Public Key</label>
              <input
                type="text"
                value={filters.pubkey}
                onChange={(e) => handleFilterChange("pubkey", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter pubkey (hex, npub, or nprofile)"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="include_deleted"
                checked={filters.include_deleted}
                onChange={(e) => handleFilterChange("include_deleted", e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="include_deleted" className="ml-2 text-sm text-gray-300">
                Include deleted VMs
              </label>
            </div>

            <div className="flex items-end">
              <Button variant="secondary" onClick={clearFilters} className="w-full">
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
        minWidth="820px"
      />

      <CreateVmModal
        isOpen={showCreateVmModal}
        onClose={() => setShowCreateVmModal(false)}
        onSuccess={handleVmCreated}
      />
    </div>
  );
}
