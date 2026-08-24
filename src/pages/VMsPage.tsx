import { CalendarDaysIcon, EyeIcon, PlayIcon, PlusIcon, StopIcon } from "@heroicons/react/24/outline";
import { bech32ToHex } from "@snort/shared";
import { tryParseNostrLink } from "@snort/system";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BulkExtendVmsModal } from "../components/BulkExtendVmsModal";
import { Button } from "../components/Button";
import { CreateVmModal } from "../components/CreateVmModal";
import { countActiveFilters, FilterBar, FilterButton, type FilterField } from "../components/FilterBar";
import { PaginatedTable } from "../components/PaginatedTable";
import { PermissionGuard } from "../components/PermissionGuard";
import { type StatItem, StatsHeader } from "../components/StatsHeader";
import { VmListRow, vmListHeaderCells } from "../components/VmListRow";
import { getVmStatus } from "../components/VmStatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { type AdminHostInfo, type AdminRegionInfo, type AdminVmInfo, VmRunningStates } from "../lib/api";

export function VMsPage() {
  const adminApi = useAdminApi();
  const navigate = useNavigate();
  const [vmIdInput, setVmIdInput] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateVmModal, setShowCreateVmModal] = useState(false);
  const [showBulkExtendModal, setShowBulkExtendModal] = useState(false);
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

  const filterFields: FilterField[] = [
    {
      kind: "number",
      key: "user_id",
      label: "User ID",
      value: filters.user_id,
      placeholder: "Enter user ID",
      onChange: (value) => handleFilterChange("user_id", value),
    },
    {
      kind: "select",
      key: "host_id",
      label: "Host",
      value: filters.host_id,
      onChange: (value) => handleFilterChange("host_id", value),
      options: [
        { value: "", label: "All hosts" },
        ...hosts.map((host) => ({ value: String(host.id), label: `${host.name} (${host.region.name})` })),
      ],
    },
    {
      kind: "select",
      key: "region_id",
      label: "Region",
      value: filters.region_id,
      onChange: (value) => handleFilterChange("region_id", value),
      options: [
        { value: "", label: "All regions" },
        ...regions.map((region) => ({ value: String(region.id), label: region.name })),
      ],
    },
    {
      kind: "text",
      key: "pubkey",
      label: "Public key",
      value: filters.pubkey,
      placeholder: "hex, npub, or nprofile",
      onChange: (value) => handleFilterChange("pubkey", value),
    },
    {
      kind: "checkbox",
      key: "include_deleted",
      label: "Include deleted VMs",
      value: filters.include_deleted,
      onChange: (value) => handleFilterChange("include_deleted", value),
    },
  ];

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

  const renderHeader = () => vmListHeaderCells();

  const renderRow = (vmInfo: AdminVmInfo, index: number) => (
    <VmListRow
      key={vmInfo.id || index}
      vm={vmInfo}
      actions={
        <>
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
        </>
      }
    />
  );

  const calculateStats = (vms: AdminVmInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      running: vms.filter((vm) => getVmStatus(vm) === VmRunningStates.RUNNING).length,
      stopped: vms.filter((vm) => getVmStatus(vm) === VmRunningStates.STOPPED).length,
      new: vms.filter((vm) => getVmStatus(vm) === "new").length,
      deleted: vms.filter((vm) => vm.deleted).length,
    };

    const statItems: StatItem[] = [
      { label: "Total", value: stats.total, tone: "accent" },
      { label: "Running", value: stats.running, tone: "success" },
      { label: "Stopped", value: stats.stopped, tone: "danger" },
      { label: "New / pending", value: stats.new, tone: "warning" },
    ];
    if (filters.include_deleted) {
      statItems.push({ label: "Deleted", value: stats.deleted, tone: "muted" });
    }

    return (
      <StatsHeader
        title="Virtual Machines"
        stats={statItems}
        actions={
          <>
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
            {/* Fleet-wide, so it needs the same gate the API uses — bulk_update,
                not the ordinary update every VM editor already has. */}
            <PermissionGuard requiredPermissions={["virtual_machines::bulk_update"]} fallback={null}>
              <Button variant="secondary" onClick={() => setShowBulkExtendModal(true)}>
                <CalendarDaysIcon className="h-4 w-4 mr-2" />
                Extend All
              </Button>
            </PermissionGuard>
            <FilterButton
              open={showFilters}
              activeCount={countActiveFilters(filterFields)}
              onClick={() => setShowFilters(!showFilters)}
            />
          </>
        }
      />
    );
  };

  return (
    <div className="space-y-4">
      <PaginatedTable
        apiCall={(params) => adminApi.getVMs({ ...params, ...getApiFilters() })}
        toolbar={
          <FilterBar
            open={showFilters}
            fields={filterFields}
            onClear={clearFilters}
            onClose={() => setShowFilters(false)}
          />
        }
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

      <BulkExtendVmsModal
        isOpen={showBulkExtendModal}
        onClose={() => setShowBulkExtendModal(false)}
        onExtended={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
}
