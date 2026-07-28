import { PencilIcon, PlusIcon, Squares2X2Icon, TrashIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/Button";
import { countActiveFilters, FilterBar, FilterButton, type FilterField } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useToast } from "../hooks/useToast";
import type { AdminAppClusterInfo, AdminRegionInfo } from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { formatBytes } from "../utils/formatBytes";

const GIB = 1024 ** 3;

function bytesToGiB(bytes: number): number {
  return Math.round((bytes / GIB) * 100) / 100;
}

export function AppClustersPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selected, setSelected] = useState<AdminAppClusterInfo | null>(null);
  const [regions, setRegions] = useState<AdminRegionInfo[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [enabledFilter, setEnabledFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const { success, error: toastError } = useToast();

  useEffect(() => {
    adminApi
      .getRegions({ limit: 100 })
      .then((response) => setRegions(response.data))
      .catch(console.error);
  }, [adminApi]);

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const regionName = (id: number) => regions.find((r) => r.id === id)?.name ?? `Region #${id}`;

  const filterFields: FilterField[] = [
    {
      kind: "text",
      key: "cluster-search",
      label: "Search",
      value: searchFilter,
      placeholder: "Name or ingress domain",
      onChange: setSearchFilter,
      colSpan: 2,
    },
    {
      kind: "select",
      key: "cluster-region",
      label: "Region",
      value: regionFilter,
      onChange: setRegionFilter,
      options: [{ value: "", label: "All regions" }, ...regions.map((r) => ({ value: String(r.id), label: r.name }))],
    },
    {
      kind: "select",
      key: "cluster-enabled",
      label: "State",
      value: enabledFilter,
      onChange: setEnabledFilter,
      options: [
        { value: "", label: "Enabled and disabled" },
        { value: "true", label: "Enabled only" },
        { value: "false", label: "Disabled only" },
      ],
    },
  ];

  const clearFilters = () => {
    setSearchFilter("");
    setEnabledFilter("");
    setRegionFilter("");
  };

  // Blanks are omitted rather than sent: the API rejects an empty value for a
  // typed filter, and an empty `search` would be a no-op round trip anyway.
  const fetchClusters = useCallback(
    (params: { limit: number; offset: number }) =>
      adminApi.getAppClusters({
        ...params,
        search: searchFilter.trim() || undefined,
        enabled: enabledFilter === "" ? undefined : enabledFilter === "true",
        region_id: regionFilter === "" ? undefined : Number(regionFilter),
      }),
    [adminApi, searchFilter, enabledFilter, regionFilter],
  );

  const handleEdit = (cluster: AdminAppClusterInfo) => {
    setSelected(cluster);
    setShowEditModal(true);
  };

  const handleDelete = async (cluster: AdminAppClusterInfo) => {
    if (
      !(await confirmDialog({
        title: "Delete Cluster",
        message: `Are you sure you want to delete cluster "${cluster.name}"? This is rejected while the cluster still has deployments.`,
      }))
    )
      return;
    try {
      await adminApi.deleteAppCluster(cluster.id);
      success("Cluster deleted");
      refreshData();
    } catch (err) {
      console.error("Failed to delete cluster:", err);
      toastError(err instanceof Error ? err.message : "Failed to delete cluster");
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Name</th>
      <th>Region</th>
      <th>Ingress Domain</th>
      <th>Capacity</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (cluster: AdminAppClusterInfo, index: number) => (
    <tr key={cluster.id || index}>
      <td className="whitespace-nowrap align-top text-white">{cluster.id}</td>
      <td className="align-top">
        <div className="truncate font-medium text-white" title={cluster.name}>
          {cluster.name}
        </div>
      </td>
      <td className="align-top text-gray-300">{regionName(cluster.region_id)}</td>
      <td className="align-top">
        <span className="font-mono text-xs text-gray-400">{cluster.ingress_domain}</span>
      </td>
      <td className="align-top text-xs text-gray-400">
        {cluster.capacity_cpu_milli / 1000} CPU · {formatBytes(cluster.capacity_memory_bytes)} ·{" "}
        {formatBytes(cluster.capacity_storage_bytes)} disk
      </td>
      <td className="align-top">
        <StatusBadge status={cluster.enabled ? "active" : "inactive"} />
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="secondary" onClick={() => handleEdit(cluster)} className="p-1">
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(cluster)}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <Squares2X2Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No app clusters configured</p>
    </div>
  );

  const calculateStats = (clusters: AdminAppClusterInfo[], totalItems: number) => (
    <StatsHeader
      title="App Clusters"
      stats={[
        { label: "Total", value: totalItems },
        { label: "Enabled", value: clusters.filter((c) => c.enabled).length, tone: "success" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <FilterButton
            open={showFilters}
            activeCount={countActiveFilters(filterFields)}
            onClick={() => setShowFilters((prev) => !prev)}
          />
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Cluster
          </Button>
        </div>
      }
    />
  );

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={fetchClusters}
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
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view app clusters"
        loadingMessage="Loading app clusters..."
        dependencies={[refreshTrigger, regions.length, searchFilter, enabledFilter, regionFilter]}
        minWidth="1000px"
      />

      <AppClusterModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        regions={regions}
        onSuccess={refreshData}
      />

      {selected && (
        <AppClusterModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelected(null);
          }}
          cluster={selected}
          regions={regions}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

function AppClusterModal({
  isOpen,
  onClose,
  cluster,
  regions,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  cluster?: AdminAppClusterInfo;
  regions: AdminRegionInfo[];
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const { success, error: toastError } = useToast();
  const isEdit = !!cluster;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: cluster?.name ?? "",
    region_id: cluster?.region_id != null ? String(cluster.region_id) : "",
    ingress_domain: cluster?.ingress_domain ?? "",
    enabled: cluster?.enabled ?? true,
    capacity_cpus: cluster ? cluster.capacity_cpu_milli / 1000 : 0,
    capacity_memory_gib: cluster ? bytesToGiB(cluster.capacity_memory_bytes) : 0,
    capacity_storage_gib: cluster ? bytesToGiB(cluster.capacity_storage_bytes) : 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cpuMilli = Math.round(formData.capacity_cpus * 1000);
      const memoryBytes = Math.round(formData.capacity_memory_gib * GIB);
      const storageBytes = Math.round(formData.capacity_storage_gib * GIB);
      if (isEdit && cluster) {
        await adminApi.updateAppCluster(cluster.id, {
          name: formData.name,
          region_id: Number(formData.region_id),
          ingress_domain: formData.ingress_domain,
          enabled: formData.enabled,
          capacity_cpu_milli: cpuMilli,
          capacity_memory_bytes: memoryBytes,
          capacity_storage_bytes: storageBytes,
        });
        success("Cluster updated");
      } else {
        await adminApi.createAppCluster({
          name: formData.name,
          region_id: Number(formData.region_id),
          ingress_domain: formData.ingress_domain,
          enabled: formData.enabled,
          capacity_cpu_milli: cpuMilli,
          capacity_memory_bytes: memoryBytes,
          capacity_storage_bytes: storageBytes,
        });
        success("Cluster created");
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save cluster:", err);
      const msg = err instanceof Error ? err.message : "Failed to save cluster";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit App Cluster" : "Create App Cluster"} size="lg">
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
              placeholder="eu-central"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Region *</label>
            <select
              value={formData.region_id}
              onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
              className=""
              required
            >
              <option value="" disabled>
                Select a region
              </option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Drives the billing company.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Ingress Domain *</label>
          <input
            type="text"
            value={formData.ingress_domain}
            onChange={(e) => setFormData({ ...formData, ingress_domain: e.target.value })}
            className="font-mono"
            placeholder="apps.lnvps.tld"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Wildcard base for hostnames: {"{name}.{ingress_domain}"}.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">CPU (cores) *</label>
            <input
              type="number"
              value={formData.capacity_cpus}
              onChange={(e) => setFormData({ ...formData, capacity_cpus: Number(e.target.value) })}
              className=""
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Memory (GiB) *</label>
            <input
              type="number"
              value={formData.capacity_memory_gib}
              onChange={(e) => setFormData({ ...formData, capacity_memory_gib: Number(e.target.value) })}
              className=""
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Storage (GiB) *</label>
            <input
              type="number"
              value={formData.capacity_storage_gib}
              onChange={(e) => setFormData({ ...formData, capacity_storage_gib: Number(e.target.value) })}
              className=""
              required
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Static total capacity available for deployments (1:1, no overcommit). A cluster with 0 capacity accepts no
          deployments.
        </p>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="cluster-enabled"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className=""
          />
          <label htmlFor="cluster-enabled" className="ml-2 text-xs text-white">
            Enabled
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update Cluster" : "Create Cluster"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
