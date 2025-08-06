import { useState, useEffect } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { AdminCustomPricingInfo, AdminRegionInfo } from "../lib/api";
import {
  PlusIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ServerIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

interface CreatePricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  regions: AdminRegionInfo[];
}

function CreatePricingModal({
  isOpen,
  onClose,
  onSuccess,
  regions,
}: CreatePricingModalProps) {
  const adminApi = useAdminApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    region_id: "",
    currency: "USD",
    cpu_cost: 0,
    memory_cost: 0,
    ip4_cost: 0,
    ip6_cost: 0,
    disk_pricing: [
      { kind: "hdd", interface: "sata", cost: 0 },
      { kind: "ssd", interface: "sata", cost: 0 },
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await adminApi.createCustomPricing({
        name: formData.name,
        region_id: parseInt(formData.region_id),
        currency: formData.currency,
        cpu_cost: formData.cpu_cost,
        memory_cost: formData.memory_cost,
        ip4_cost: formData.ip4_cost,
        ip6_cost: formData.ip6_cost,
        disk_pricing: formData.disk_pricing,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to create custom pricing:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDiskPricing = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    const newDiskPricing = [...formData.disk_pricing];
    newDiskPricing[index] = { ...newDiskPricing[index], [field]: value };
    setFormData({ ...formData, disk_pricing: newDiskPricing });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Custom Pricing Model"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Region
            </label>
            <select
              value={formData.region_id}
              onChange={(e) =>
                setFormData({ ...formData, region_id: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              required
            >
              <option value="">Select Region</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="BTC">BTC</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              CPU Cost (per core/month)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.cpu_cost}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cpu_cost: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Memory Cost (per GB/month)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.memory_cost}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  memory_cost: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              IPv4 Cost (per IP/month)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.ip4_cost}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ip4_cost: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              IPv6 Cost (per IP/month)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.ip6_cost}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ip6_cost: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            />
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium text-white mb-3">Disk Pricing</h4>
          <div className="space-y-3">
            {formData.disk_pricing.map((disk, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-slate-700 rounded-md"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={disk.kind}
                    onChange={(e) =>
                      updateDiskPricing(index, "kind", e.target.value)
                    }
                    className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  >
                    <option value="hdd">HDD</option>
                    <option value="ssd">SSD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Interface
                  </label>
                  <select
                    value={disk.interface}
                    onChange={(e) =>
                      updateDiskPricing(index, "interface", e.target.value)
                    }
                    className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  >
                    <option value="sata">SATA</option>
                    <option value="scsi">SCSI</option>
                    <option value="pcie">PCIe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Cost (per GB/month)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={disk.cost}
                    onChange={(e) =>
                      updateDiskPricing(
                        index,
                        "cost",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Pricing Model"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CustomPricingPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [regions, setRegions] = useState<AdminRegionInfo[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: currency === "BTC" ? 6 : 2,
    }).format(amount);
  };

  // Load regions when component mounts
  useEffect(() => {
    adminApi
      .getRegions({ limit: 100 })
      .then((response) => {
        setRegions(response.data);
      })
      .catch(console.error);
  }, []);

  const handleCreateSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this pricing model?")) {
      return;
    }

    try {
      await adminApi.deleteCustomPricing(id);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to delete pricing model:", error);
    }
  };

  const handleCopy = async (id: number, name: string) => {
    const newName = prompt(
      "Enter name for the copied pricing model:",
      `${name} (Copy)`,
    );
    if (!newName) return;

    try {
      await adminApi.copyCustomPricing(id, { name: newName });
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to copy pricing model:", error);
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>Name & Region</th>
      <th>Resource Costs</th>
      <th>Disk Costs</th>
      <th>Templates</th>
      <th>Status</th>
      <th>Actions</th>
    </>
  );

  const renderRow = (pricing: AdminCustomPricingInfo, index: number) => (
    <tr key={pricing.id || index}>
      <td className="whitespace-nowrap text-white">{pricing.id}</td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="font-medium text-white">{pricing.name}</div>
          <div className="flex items-center text-gray-400">
            <GlobeAltIcon className="h-4 w-4 mr-1" />
            {pricing.region_name || `Region ${pricing.region_id}`}
          </div>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5 text-sm">
          <div>
            CPU: {formatCurrency(pricing.cpu_cost, pricing.currency)}/core
          </div>
          <div>
            RAM: {formatCurrency(pricing.memory_cost, pricing.currency)}/GB
          </div>
          <div>
            IPv4: {formatCurrency(pricing.ip4_cost, pricing.currency)}/IP
          </div>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5 text-sm">
          {pricing.disk_pricing.map((disk, idx) => (
            <div key={idx}>
              {disk.kind.toUpperCase()} {disk.interface.toUpperCase()}:{" "}
              {formatCurrency(disk.cost, pricing.currency)}/GB
            </div>
          ))}
        </div>
      </td>
      <td className="text-gray-300">
        <div className="flex items-center">
          <ServerIcon className="h-4 w-4 mr-1 text-gray-400" />
          {pricing.template_count}
        </div>
      </td>
      <td>
        <div className="space-y-1">
          <StatusBadge status={pricing.enabled ? "enabled" : "disabled"} />
          {pricing.expires && new Date(pricing.expires) < new Date() && (
            <div>
              <StatusBadge status="expired" />
            </div>
          )}
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(pricing.id, pricing.name)}
            className="p-1 text-blue-400 hover:text-blue-300 rounded"
            title="Copy pricing model"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(pricing.id)}
            className="p-1 text-red-400 hover:text-red-300 rounded"
            title="Delete pricing model"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  const calculateStats = (
    pricingModels: AdminCustomPricingInfo[],
    totalItems: number,
  ) => {
    const stats = {
      total: totalItems,
      enabled: pricingModels.filter((p) => p.enabled).length,
      disabled: pricingModels.filter((p) => !p.enabled).length,
      expired: pricingModels.filter(
        (p) => p.expires && new Date(p.expires) < new Date(),
      ).length,
      totalTemplates: pricingModels.reduce(
        (sum, p) => sum + p.template_count,
        0,
      ),
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Custom Pricing Models
          </h1>
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
              Templates:{" "}
              <span className="text-blue-400 font-medium">
                {stats.totalTemplates}
              </span>
            </span>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Create Pricing Model
        </Button>
      </div>
    );
  };

  const apiCall = (params: any) => {
    return adminApi.getCustomPricing(params);
  };

  return (
    <div>
      <PaginatedTable
        key={refreshTrigger}
        apiCall={apiCall}
        renderHeader={renderHeader}
        renderRow={renderRow}
        calculateStats={calculateStats}
        itemsPerPage={15}
        errorAction="view custom pricing models"
        loadingMessage="Loading custom pricing models..."
      />

      <CreatePricingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        regions={regions}
      />
    </div>
  );
}
