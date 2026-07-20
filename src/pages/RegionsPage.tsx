import { GlobeAltIcon, PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminCompanyInfo, AdminRegionInfo } from "../lib/api";
import { confirmDialog } from "../services/confirmService";

export function RegionsPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<AdminRegionInfo | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyInfo[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await adminApi.getCompanies({ limit: 100 });
        setCompanies(response.data);
      } catch (error) {
        console.error("Failed to load companies:", error);
      }
    };
    loadCompanies();
  }, [adminApi]);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const getCompanyName = (companyId: number | null) => {
    if (!companyId) return null;
    const company = companies.find((c) => c.id === companyId);
    return company ? company.name : `Company ${companyId}`;
  };

  const handleEdit = (region: AdminRegionInfo) => {
    setSelectedRegion(region);
    setShowEditModal(true);
  };

  const handleDelete = async (region: AdminRegionInfo) => {
    if (
      await confirmDialog({
        title: "Delete Region",
        message: `Are you sure you want to delete region "${region.name}"?`,
      })
    ) {
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
      <th>Counts</th>
      <th>Resources</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (region: AdminRegionInfo, index: number) => (
    <tr key={region.id || index}>
      <td className="whitespace-nowrap align-top text-white">{region.id}</td>
      <td className="align-top text-gray-300">
        <div className="min-w-0 max-w-[16rem]">
          <div className="truncate font-medium" title={region.name}>
            {region.name}
          </div>
          {region.company_id && (
            <div className="mt-0.5 truncate text-xs text-slate-400" title={getCompanyName(region.company_id) || ""}>
              {getCompanyName(region.company_id)}
            </div>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap align-top">
        <StatusBadge status={region.enabled ? "enabled" : "disabled"} />
      </td>
      <td className="align-top text-gray-300">
        <div className="text-xs space-y-0.5">
          <div>
            <span className="font-medium text-white">{region.host_count}</span> hosts
          </div>
          <div>
            <span className="font-medium text-white">{region.total_vms}</span> VMs
          </div>
          <div>
            <span className="font-medium text-purple-400">{region.total_ip_assignments}</span> IPs
          </div>
        </div>
      </td>
      <td className="align-top text-gray-300">
        <div className="text-xs space-y-0.5">
          <div className="text-blue-400">{region.total_cpu_cores} cores</div>
          <div className="text-blue-300">{Math.round(region.total_memory_bytes / (1024 * 1024 * 1024))} GB</div>
        </div>
      </td>
      <td className="whitespace-nowrap text-right align-top">
        <div className="flex justify-end space-x-1">
          <Button size="sm" variant="secondary" onClick={() => handleEdit(region)} className="p-1">
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
      totalCPU: regions.reduce((sum, region) => sum + region.total_cpu_cores, 0),
    };

    return (
      <StatsHeader
        title="Regions"
        stats={[
          { label: "Total", value: stats.total },
          { label: "Enabled", value: stats.enabled, tone: "success" },
          { label: "Disabled", value: stats.disabled, tone: "danger" },
          { label: "Hosts", value: stats.totalHosts, tone: "purple" },
          { label: "VMs", value: stats.totalVMs, tone: "success" },
          { label: "CPU", value: stats.totalCPU, tone: "accent" },
        ]}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Region
          </Button>
        }
      />
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
        companies={companies}
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
          companies={companies}
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
  companies,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: AdminCompanyInfo[];
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
          <label className="block text-sm font-medium text-white mb-2">Region Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className=""
            placeholder="e.g., US-East, EU-West"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Company</label>
          <select
            value={formData.company_id}
            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
            className=""
          >
            <option value="">No company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id.toString()}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="h-4 w-4 text-blue-600 bg-slate-800 border-slate-600 rounded"
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
  companies,
}: {
  isOpen: boolean;
  onClose: () => void;
  region: AdminRegionInfo;
  onSuccess: () => void;
  companies: AdminCompanyInfo[];
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
          <label className="block text-sm font-medium text-white mb-2">Region Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className=""
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Company</label>
          <select
            value={formData.company_id}
            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
            className=""
          >
            <option value="">No company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id.toString()}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled-edit"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="h-4 w-4 text-blue-600 bg-slate-800 border-slate-600 rounded"
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
