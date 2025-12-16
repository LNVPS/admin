import { useState, useEffect } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { useCachedRegions } from "../hooks/useCachedRegions";
import { Modal } from "./Modal";
import { Button } from "./Button";
import type { AdminCustomPricingInfo } from "../lib/api";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface EditPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pricing: AdminCustomPricingInfo;
}

export function EditPricingModal({
  isOpen,
  onClose,
  onSuccess,
  pricing,
}: EditPricingModalProps) {
  const adminApi = useAdminApi();
  const { data: regions = [] } = useCachedRegions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: pricing.name,
    enabled: pricing.enabled,
    region_id: pricing.region_id.toString(),
    currency: pricing.currency,
    cpu_cost: pricing.cpu_cost,
    memory_cost: pricing.memory_cost,
    ip4_cost: pricing.ip4_cost,
    ip6_cost: pricing.ip6_cost,
    min_cpu: pricing.min_cpu,
    max_cpu: pricing.max_cpu,
    min_memory: pricing.min_memory,
    max_memory: pricing.max_memory,
    disk_pricing: pricing.disk_pricing.map((disk) => ({
      kind: disk.kind as string,
      interface: disk.interface as string,
      cost: disk.cost,
      min_disk_size: disk.min_disk_size,
      max_disk_size: disk.max_disk_size,
    })),
  });

  // Reset form data when pricing prop changes
  useEffect(() => {
    setFormData({
      name: pricing.name,
      enabled: pricing.enabled,
      region_id: pricing.region_id.toString(),
      currency: pricing.currency,
      cpu_cost: pricing.cpu_cost,
      memory_cost: pricing.memory_cost,
      ip4_cost: pricing.ip4_cost,
      ip6_cost: pricing.ip6_cost,
      min_cpu: pricing.min_cpu,
      max_cpu: pricing.max_cpu,
      min_memory: pricing.min_memory,
      max_memory: pricing.max_memory,
      disk_pricing: pricing.disk_pricing.map((disk) => ({
        kind: disk.kind as string,
        interface: disk.interface as string,
        cost: disk.cost,
        min_disk_size: disk.min_disk_size,
        max_disk_size: disk.max_disk_size,
      })),
    });
  }, [pricing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await adminApi.updateCustomPricing(pricing.id, {
        name: formData.name,
        enabled: formData.enabled,
        region_id: parseInt(formData.region_id),
        currency: formData.currency,
        cpu_cost: formData.cpu_cost,
        memory_cost: formData.memory_cost,
        ip4_cost: formData.ip4_cost,
        ip6_cost: formData.ip6_cost,
        min_cpu: formData.min_cpu,
        max_cpu: formData.max_cpu,
        min_memory: formData.min_memory,
        max_memory: formData.max_memory,
        disk_pricing: formData.disk_pricing,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update custom pricing:", error);
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

  const addDiskPricing = () => {
    const newDiskPricing = [
      ...formData.disk_pricing,
      {
        kind: "hdd",
        interface: "sata",
        cost: 0,
        min_disk_size: 10 * 1024 * 1024 * 1024, // 10GB in bytes
        max_disk_size: 10 * 1024 * 1024 * 1024 * 1024, // 10TB in bytes
      },
    ];
    setFormData({ ...formData, disk_pricing: newDiskPricing });
  };

  const removeDiskPricing = (index: number) => {
    if (formData.disk_pricing.length <= 1) return; // Keep at least one row
    const newDiskPricing = formData.disk_pricing.filter((_, i) => i !== index);
    setFormData({ ...formData, disk_pricing: newDiskPricing });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Custom Pricing Model"
      size="3xl"
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
              required
            >
              <option value="">Select Region</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id.toString()}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) =>
                setFormData({ ...formData, enabled: e.target.checked })
              }
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-300">
              Enabled (pricing model is available for use)
            </span>
          </label>
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
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="BTC">BTC</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            />
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium text-white mb-3">
            Resource Limits
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Min CPU Cores
            </label>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Max CPU Cores
            </label>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Min Memory (GB)
            </label>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Max Memory (GB)
            </label>
            <input
              type="number"
              min="1"
              max="999"
              value={formData.min_cpu}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  min_cpu: parseInt(e.target.value) || 1,
                })
              }
            />
            <input
              type="number"
              min="1"
              max="999"
              value={formData.max_cpu}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_cpu: parseInt(e.target.value) || 64,
                })
              }
            />
            <input
              type="number"
              min="1"
              max="9999"
              value={Math.round(formData.min_memory / (1024 * 1024 * 1024))}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  min_memory:
                    (parseInt(e.target.value) || 1) * 1024 * 1024 * 1024,
                })
              }
            />
            <input
              type="number"
              min="1"
              max="9999"
              value={Math.round(formData.max_memory / (1024 * 1024 * 1024))}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_memory:
                    (parseInt(e.target.value) || 128) * 1024 * 1024 * 1024,
                })
              }
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-medium text-white">Disk Pricing</h4>
            <Button
              type="button"
              variant="secondary"
              onClick={addDiskPricing}
              className="flex items-center gap-2 text-sm px-3 py-1"
            >
              <PlusIcon className="h-4 w-4" />
              Add Row
            </Button>
          </div>
          <div className="space-y-3">
            {formData.disk_pricing.map((disk, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-6 gap-x-2 p-3 bg-slate-700 rounded-md"
              >
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Type
                </label>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Interface
                </label>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Cost (per GB/month)
                </label>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Min Size (GB)
                </label>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Max Size (GB)
                </label>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Actions
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
                <input
                  type="number"
                  min="1"
                  value={Math.round(disk.min_disk_size / (1024 * 1024 * 1024))}
                  onChange={(e) =>
                    updateDiskPricing(
                      index,
                      "min_disk_size",
                      (parseInt(e.target.value) || 10) * 1024 * 1024 * 1024,
                    )
                  }
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                />
                <input
                  type="number"
                  min="1"
                  value={Math.round(disk.max_disk_size / (1024 * 1024 * 1024))}
                  onChange={(e) =>
                    updateDiskPricing(
                      index,
                      "max_disk_size",
                      (parseInt(e.target.value) || 1000) * 1024 * 1024 * 1024,
                    )
                  }
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                />
                <Button
                  onClick={() => removeDiskPricing(index)}
                  title="Remove disk pricing row"
                  disabled={formData.disk_pricing.length <= 1}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Pricing Model"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
