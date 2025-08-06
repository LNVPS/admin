import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { AdminRegionInfo } from "../lib/api";
import {
  GlobeAltIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export function RegionsPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<AdminRegionInfo | null>(
    null,
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (region: AdminRegionInfo) => {
    setSelectedRegion(region);
    setShowEditModal(true);
  };

  const handleDelete = async (region: AdminRegionInfo) => {
    if (confirm(`Are you sure you want to delete region "${region.name}"?`)) {
      try {
        await adminApi.deleteRegion(region.id);
        refreshData(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete region:", error);
      }
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>Region</th>
      <th>Status</th>
      <th>Hosts</th>
      <th>VMs</th>
      <th>Resources</th>
      <th>IPs</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (region: AdminRegionInfo, index: number) => (
    <tr key={region.id || index}>
      <td className="whitespace-nowrap text-white">{region.id}</td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="font-medium">{region.name}</div>
          {region.company_id && (
            <div className="text-gray-400">Company: {region.company_id}</div>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap">
        <StatusBadge status={region.enabled ? "enabled" : "disabled"} />
      </td>
      <td className="whitespace-nowrap text-white">{region.host_count}</td>
      <td className="whitespace-nowrap text-white">{region.total_vms}</td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="text-blue-400">{region.total_cpu_cores} cores</div>
          <div className="text-blue-300">
            {Math.round(region.total_memory_bytes / (1024 * 1024 * 1024))} GB
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap text-purple-400">
        {region.total_ip_assignments}
      </td>
      <td className="whitespace-nowrap text-right">
        <div className="flex justify-end space-x-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEdit(region)}
            className="p-1"
          >
            <PencilIcon className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(region)}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <TrashIcon className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <GlobeAltIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No regions found</p>
    </div>
  );

  const calculateStats = (regions: AdminRegionInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      enabled: regions.filter((region) => region.enabled).length,
      disabled: regions.filter((region) => !region.enabled).length,
      totalHosts: regions.reduce((sum, region) => sum + region.host_count, 0),
      totalVMs: regions.reduce((sum, region) => sum + region.total_vms, 0),
      totalCPU: regions.reduce(
        (sum, region) => sum + region.total_cpu_cores,
        0,
      ),
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Regions</h1>
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
              Disabled:{" "}
              <span className="text-red-400 font-medium">{stats.disabled}</span>
            </span>
            <span>
              Hosts:{" "}
              <span className="text-purple-400 font-medium">
                {stats.totalHosts}
              </span>
            </span>
            <span>
              VMs:{" "}
              <span className="text-green-400 font-medium">
                {stats.totalVMs}
              </span>
            </span>
            <span>
              CPU:{" "}
              <span className="text-blue-400 font-medium">
                {stats.totalCPU}
              </span>
            </span>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Region
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getRegions(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view regions"
        loadingMessage="Loading regions..."
        dependencies={[refreshTrigger]}
        minWidth="800px"
      />

      {/* Create Region Modal */}
      <CreateRegionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refreshData}
      />

      {/* Edit Region Modal */}
      {selectedRegion && (
        <EditRegionModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRegion(null);
          }}
          region={selectedRegion}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

// Create Region Modal Component
function CreateRegionModal({
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
  const [formData, setFormData] = useState({
    name: "",
    enabled: true,
    company_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await adminApi.createRegion({
        name: formData.name,
        enabled: formData.enabled,
        company_id: formData.company_id ? parseInt(formData.company_id) : null,
      });
      onSuccess();
      onClose();
      setFormData({ name: "", enabled: true, company_id: "" });
    } catch (error) {
      console.error("Failed to create region:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Region">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Region Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="e.g., US-East, EU-West"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Company ID
          </label>
          <input
            type="number"
            value={formData.company_id}
            onChange={(e) =>
              setFormData({ ...formData, company_id: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="Leave empty for no company"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData({ ...formData, enabled: e.target.checked })
            }
            className="h-4 w-4 text-primary-600 bg-slate-800 border-slate-600 rounded"
          />
          <label htmlFor="enabled" className="ml-2 text-sm text-white">
            Enable region
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Region"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Region Modal Component
function EditRegionModal({
  isOpen,
  onClose,
  region,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  region: AdminRegionInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: region.name,
    enabled: region.enabled,
    company_id: region.company_id?.toString() || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await adminApi.updateRegion(region.id, {
        name: formData.name,
        enabled: formData.enabled,
        company_id: formData.company_id ? parseInt(formData.company_id) : null,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update region:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Region">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Region Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Company ID
          </label>
          <input
            type="number"
            value={formData.company_id}
            onChange={(e) =>
              setFormData({ ...formData, company_id: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="Leave empty for no company"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled-edit"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData({ ...formData, enabled: e.target.checked })
            }
            className="h-4 w-4 text-primary-600 bg-slate-800 border-slate-600 rounded"
          />
          <label htmlFor="enabled-edit" className="ml-2 text-sm text-white">
            Enable region
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Region"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
