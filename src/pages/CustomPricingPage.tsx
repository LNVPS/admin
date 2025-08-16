import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/Button";
import { CreatePricingModal } from "../components/CreatePricingModal";
import { EditPricingModal } from "../components/EditPricingModal";
import { AdminCustomPricingInfo } from "../lib/api";
import { formatBytes } from "../utils/formatBytes";
import {
  PlusIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PencilIcon,
  ServerIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { formatCurrency } from "../utils/currency";

export function CustomPricingPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPricing, setEditingPricing] =
    useState<AdminCustomPricingInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  const handleEdit = (pricing: AdminCustomPricingInfo) => {
    setEditingPricing(pricing);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>Name & Region</th>
      <th>Resource Costs</th>
      <th>Constraints</th>
      <th>Disk Costs</th>
      <th>Templates</th>
      <th>Status</th>
      <th>Actions</th>
    </>
  );

  const renderRow = (pricing: AdminCustomPricingInfo, index: number) => {
    const mul = pricing.currency === "BTC" ? 1e9 : 100;
    const maxDigits = pricing.currency === "BTC" ? 11 : 5;
    return <tr key={pricing.id || index}>
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
            CPU: {formatCurrency(pricing.cpu_cost * mul, pricing.currency, undefined, maxDigits)}/core
          </div>
          <div>
            RAM: {formatCurrency(pricing.memory_cost * mul, pricing.currency, undefined, maxDigits)}
            /GB
          </div>
          <div>
            IPv4: {formatCurrency(pricing.ip4_cost * mul, pricing.currency, undefined, maxDigits)}/IP
          </div>
          <div>
            IPv6: {formatCurrency(pricing.ip6_cost * mul, pricing.currency, undefined, maxDigits)}/IP
          </div>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5 text-sm">
          <div>
            CPU: {pricing.min_cpu}-{pricing.max_cpu} cores
          </div>
          <div>
            RAM: {formatBytes(pricing.min_memory)}-
            {formatBytes(pricing.max_memory)}
          </div>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5 text-sm">
          {pricing.disk_pricing.map((disk, idx) => (
            <div key={idx}>
              <div>
                {disk.kind.toUpperCase()} {disk.interface.toUpperCase()}:{" "}
                {formatCurrency(disk.cost * mul, pricing.currency, undefined, maxDigits)}/GB
              </div>
              <div className="text-xs text-gray-400">
                {formatBytes(disk.min_disk_size)}-
                {formatBytes(disk.max_disk_size)}
              </div>
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
            onClick={() => handleEdit(pricing)}
            className="p-1 text-green-400 hover:text-green-300 rounded"
            title="Edit pricing model"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
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
  }

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
      />

      {editingPricing && (
        <EditPricingModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
          pricing={editingPricing}
        />
      )}
    </div>
  );
}
