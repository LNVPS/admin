import {
  DocumentDuplicateIcon,
  GlobeAltIcon,
  PencilIcon,
  PlusIcon,
  ServerIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "../components/Button";
import { PaginatedTable } from "../components/PaginatedTable";
import { PricingModal } from "../components/PricingModal";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminCustomPricingInfo } from "../lib/api";
import { formatCurrency } from "../utils/currency";
import { formatBytes } from "../utils/formatBytes";

export function CustomPricingPage() {
  const adminApi = useAdminApi();
  const [showModal, setShowModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState<AdminCustomPricingInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
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
    const newName = prompt("Enter name for the copied pricing model:", `${name} (Copy)`);
    if (!newName) return;

    try {
      await adminApi.copyCustomPricing(id, { name: newName });
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to copy pricing model:", error);
    }
  };

  const handleCreate = () => {
    setEditingPricing(null);
    setShowModal(true);
  };

  const handleEdit = (pricing: AdminCustomPricingInfo) => {
    setEditingPricing(pricing);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPricing(null);
  };

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>Name & Region</th>
      <th>Resource Costs</th>
      <th>Constraints</th>
      <th>Disk Costs</th>
      <th>Templates & Status</th>
      <th>Actions</th>
    </>
  );

  const renderRow = (pricing: AdminCustomPricingInfo, index: number) => {
    // API returns values in smallest units (cents/millisats), formatCurrency handles conversion
    const maxDigits = pricing.currency === "BTC" ? 3 : 2;
    return (
      <tr key={pricing.id || index}>
        <td className="whitespace-nowrap align-top text-white">{pricing.id}</td>
        <td className="align-top text-gray-300">
          <div className="min-w-0 max-w-[14rem]">
            <div className="truncate font-medium text-white" title={pricing.name}>
              {pricing.name}
            </div>
            <div className="mt-0.5 flex items-center text-xs text-slate-400">
              <GlobeAltIcon className="mr-1 h-3.5 w-3.5 shrink-0" />
              <span className="truncate" title={pricing.region_name || `Region ${pricing.region_id}`}>
                {pricing.region_name || `Region ${pricing.region_id}`}
              </span>
            </div>
          </div>
        </td>
        <td className="align-top text-gray-300">
          <div className="space-y-0.5 text-sm tabular-nums">
            <div>
              CPU: {formatCurrency(pricing.cpu_cost, pricing.currency, undefined, maxDigits)}
              /core
            </div>
            <div>
              RAM: {formatCurrency(pricing.memory_cost, pricing.currency, undefined, maxDigits)}
              /GB
            </div>
            <div>
              IPv4: {formatCurrency(pricing.ip4_cost, pricing.currency, undefined, maxDigits)}
              /IP
            </div>
            <div>
              IPv6: {formatCurrency(pricing.ip6_cost, pricing.currency, undefined, maxDigits)}
              /IP
            </div>
          </div>
        </td>
        <td className="align-top text-gray-300">
          <div className="min-w-0 max-w-[14rem] space-y-0.5 text-sm">
            <div>
              CPU: {pricing.min_cpu}-{pricing.max_cpu} cores
            </div>
            <div>
              RAM: {formatBytes(pricing.min_memory)}-{formatBytes(pricing.max_memory)}
            </div>
            {(pricing.cpu_mfg || pricing.cpu_arch) && (
              <div className="truncate text-xs text-slate-400">
                {[pricing.cpu_mfg, pricing.cpu_arch].filter(Boolean).join(" / ")}
              </div>
            )}
            {pricing.cpu_features?.length > 0 && (
              <div className="truncate text-xs text-slate-400" title={pricing.cpu_features.join(", ")}>
                {pricing.cpu_features.join(", ")}
              </div>
            )}
          </div>
        </td>
        <td className="align-top text-gray-300">
          <div className="space-y-0.5 text-sm tabular-nums">
            {pricing.disk_pricing.map((disk, idx) => (
              <div key={idx}>
                <div>
                  {disk.kind.toUpperCase()} {disk.interface.toUpperCase()}:{" "}
                  {formatCurrency(disk.cost, pricing.currency, undefined, maxDigits)}
                  /GB
                </div>
                <div className="text-xs text-slate-400">
                  {formatBytes(disk.min_disk_size)}-{formatBytes(disk.max_disk_size)}
                </div>
              </div>
            ))}
          </div>
        </td>
        {/* Templates + status */}
        <td className="align-top text-gray-300">
          <div className="flex items-center">
            <ServerIcon className="mr-1 h-4 w-4 text-slate-400" />
            {pricing.template_count}
          </div>
          <div className="mt-1.5 space-y-1">
            <StatusBadge status={pricing.enabled ? "enabled" : "disabled"} />
            {pricing.expires && new Date(pricing.expires) < new Date() && (
              <div>
                <StatusBadge status="expired" />
              </div>
            )}
          </div>
        </td>
        <td className="align-top">
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
    );
  };

  const calculateStats = (pricingModels: AdminCustomPricingInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      enabled: pricingModels.filter((p) => p.enabled).length,
      disabled: pricingModels.filter((p) => !p.enabled).length,
      expired: pricingModels.filter((p) => p.expires && new Date(p.expires) < new Date()).length,
      totalTemplates: pricingModels.reduce((sum, p) => sum + p.template_count, 0),
    };

    return (
      <StatsHeader
        title="Custom Pricing Models"
        stats={[
          { label: "Total", value: stats.total },
          { label: "Enabled", value: stats.enabled, tone: "success" },
          { label: "Disabled", value: stats.disabled, tone: "danger" },
          { label: "Templates", value: stats.totalTemplates, tone: "accent" },
        ]}
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Create Pricing Model
          </Button>
        }
      />
    );
  };

  const apiCall = async (params: any) => {
    const result = await adminApi.getCustomPricing(params);
    result.data.sort((a, b) => b.id - a.id);
    return result;
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
        minWidth="1000px"
      />

      <PricingModal isOpen={showModal} onClose={handleCloseModal} onSuccess={handleSuccess} pricing={editingPricing} />
    </div>
  );
}
