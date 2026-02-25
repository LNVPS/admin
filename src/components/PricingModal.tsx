import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { useCachedRegions } from "../hooks/useCachedRegions";
import type { AdminCustomPricingInfo } from "../lib/api";
import { CpuArch, CpuFeature, CpuMfg } from "../lib/api";
import { fromSmallestUnits, toSmallestUnits } from "../utils/currency";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { MultiSelect } from "./MultiSelect";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pricing?: AdminCustomPricingInfo | null;
}

interface DiskPricingFormData {
  kind: string;
  interface: string;
  cost: string;
  min_disk_size: string;
  max_disk_size: string;
}

interface FormData {
  name: string;
  enabled: boolean;
  region_id: string;
  currency: string;
  cpu_mfg: string;
  cpu_arch: string;
  cpu_features: string[];
  cpu_cost: string;
  memory_cost: string;
  ip4_cost: string;
  ip6_cost: string;
  min_cpu: string;
  max_cpu: string;
  min_memory: string;
  max_memory: string;
  disk_pricing: DiskPricingFormData[];
  cpu_limit: string;
  network_mbps: string;
  disk_iops_read: string;
  disk_iops_write: string;
  disk_mbps_read: string;
  disk_mbps_write: string;
}

const DEFAULT_DISK_PRICING: DiskPricingFormData[] = [
  { kind: "hdd", interface: "sata", cost: "", min_disk_size: "10", max_disk_size: "10000" },
  { kind: "ssd", interface: "sata", cost: "", min_disk_size: "10", max_disk_size: "4000" },
];

const getDefaultFormData = (): FormData => ({
  name: "",
  enabled: true,
  region_id: "",
  currency: "USD",
  cpu_mfg: "",
  cpu_arch: "",
  cpu_features: [],
  cpu_cost: "",
  memory_cost: "",
  ip4_cost: "",
  ip6_cost: "",
  min_cpu: "1",
  max_cpu: "64",
  min_memory: "1",
  max_memory: "128",
  disk_pricing: [...DEFAULT_DISK_PRICING],
  cpu_limit: "",
  network_mbps: "",
  disk_iops_read: "",
  disk_iops_write: "",
  disk_mbps_read: "",
  disk_mbps_write: "",
});

const getFormDataFromPricing = (pricing: AdminCustomPricingInfo): FormData => ({
  name: pricing.name,
  enabled: pricing.enabled,
  region_id: pricing.region_id.toString(),
  currency: pricing.currency,
  cpu_mfg: pricing.cpu_mfg || "",
  cpu_arch: pricing.cpu_arch || "",
  cpu_features: pricing.cpu_features || [],
  cpu_cost: fromSmallestUnits(pricing.cpu_cost, pricing.currency).toString(),
  memory_cost: fromSmallestUnits(pricing.memory_cost, pricing.currency).toString(),
  ip4_cost: fromSmallestUnits(pricing.ip4_cost, pricing.currency).toString(),
  ip6_cost: fromSmallestUnits(pricing.ip6_cost, pricing.currency).toString(),
  min_cpu: pricing.min_cpu.toString(),
  max_cpu: pricing.max_cpu.toString(),
  min_memory: Math.round(pricing.min_memory / (1024 * 1024 * 1024)).toString(),
  max_memory: Math.round(pricing.max_memory / (1024 * 1024 * 1024)).toString(),
  disk_pricing: pricing.disk_pricing.map((disk) => ({
    kind: disk.kind as string,
    interface: disk.interface as string,
    cost: fromSmallestUnits(disk.cost, pricing.currency).toString(),
    min_disk_size: Math.round(disk.min_disk_size / (1024 * 1024 * 1024)).toString(),
    max_disk_size: Math.round(disk.max_disk_size / (1024 * 1024 * 1024)).toString(),
  })),
  cpu_limit: pricing.cpu_limit != null ? pricing.cpu_limit.toString() : "",
  network_mbps: pricing.network_mbps != null ? pricing.network_mbps.toString() : "",
  disk_iops_read: pricing.disk_iops_read != null ? pricing.disk_iops_read.toString() : "",
  disk_iops_write: pricing.disk_iops_write != null ? pricing.disk_iops_write.toString() : "",
  disk_mbps_read: pricing.disk_mbps_read != null ? pricing.disk_mbps_read.toString() : "",
  disk_mbps_write: pricing.disk_mbps_write != null ? pricing.disk_mbps_write.toString() : "",
});

export function PricingModal({ isOpen, onClose, onSuccess, pricing }: PricingModalProps) {
  const adminApi = useAdminApi();
  const { data: regions = [] } = useCachedRegions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(getDefaultFormData);

  const isEditMode = !!pricing;

  // Reset form data when pricing prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(pricing ? getFormDataFromPricing(pricing) : getDefaultFormData());
    }
  }, [pricing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const submitData: any = {
        name: formData.name,
        enabled: formData.enabled,
        region_id: parseInt(formData.region_id),
        currency: formData.currency,
        cpu_cost: toSmallestUnits(parseFloat(formData.cpu_cost) || 0, formData.currency),
        memory_cost: toSmallestUnits(parseFloat(formData.memory_cost) || 0, formData.currency),
        ip4_cost: toSmallestUnits(parseFloat(formData.ip4_cost) || 0, formData.currency),
        ip6_cost: toSmallestUnits(parseFloat(formData.ip6_cost) || 0, formData.currency),
        min_cpu: parseInt(formData.min_cpu) || 0,
        max_cpu: parseInt(formData.max_cpu) || 0,
        min_memory: (parseInt(formData.min_memory) || 0) * 1024 * 1024 * 1024,
        max_memory: (parseInt(formData.max_memory) || 0) * 1024 * 1024 * 1024,
        disk_pricing: formData.disk_pricing.map((disk) => ({
          kind: disk.kind,
          interface: disk.interface,
          cost: toSmallestUnits(parseFloat(disk.cost) || 0, formData.currency),
          min_disk_size: (parseInt(disk.min_disk_size) || 0) * 1024 * 1024 * 1024,
          max_disk_size: (parseInt(disk.max_disk_size) || 0) * 1024 * 1024 * 1024,
        })),
      };

      if (formData.cpu_mfg) {
        submitData.cpu_mfg = formData.cpu_mfg;
      }
      if (formData.cpu_arch) {
        submitData.cpu_arch = formData.cpu_arch;
      }
      if (formData.cpu_features.length > 0) {
        submitData.cpu_features = formData.cpu_features;
      }

      submitData.cpu_limit = formData.cpu_limit !== "" ? parseFloat(formData.cpu_limit) : null;
      submitData.network_mbps = formData.network_mbps !== "" ? parseFloat(formData.network_mbps) : null;
      submitData.disk_iops_read = formData.disk_iops_read !== "" ? parseInt(formData.disk_iops_read) : null;
      submitData.disk_iops_write = formData.disk_iops_write !== "" ? parseInt(formData.disk_iops_write) : null;
      submitData.disk_mbps_read = formData.disk_mbps_read !== "" ? parseFloat(formData.disk_mbps_read) : null;
      submitData.disk_mbps_write = formData.disk_mbps_write !== "" ? parseFloat(formData.disk_mbps_write) : null;

      if (isEditMode && pricing) {
        await adminApi.updateCustomPricing(pricing.id, submitData);
      } else {
        await adminApi.createCustomPricing(submitData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(`Failed to ${isEditMode ? "update" : "create"} custom pricing:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDiskPricing = (index: number, field: string, value: string) => {
    const newDiskPricing = [...formData.disk_pricing];
    newDiskPricing[index] = { ...newDiskPricing[index], [field]: value };
    setFormData({ ...formData, disk_pricing: newDiskPricing });
  };

  const addDiskPricing = () => {
    setFormData({
      ...formData,
      disk_pricing: [
        ...formData.disk_pricing,
        { kind: "hdd", interface: "sata", cost: "", min_disk_size: "10", max_disk_size: "10000" },
      ],
    });
  };

  const removeDiskPricing = (index: number) => {
    if (formData.disk_pricing.length <= 1) return;
    setFormData({
      ...formData,
      disk_pricing: formData.disk_pricing.filter((_, i) => i !== index),
    });
  };

  const title = isEditMode ? "Edit Custom Pricing Model" : "Create Custom Pricing Model";
  const submitText = isEditMode ? "Update Pricing Model" : "Create Pricing Model";
  const submittingText = isEditMode ? "Updating..." : "Creating...";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name & Region */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Region</label>
            <select
              value={formData.region_id}
              onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
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

        {/* Enabled checkbox */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-300">Enabled (pricing model is available for use)</span>
          </label>
        </div>

        {/* Currency & CPU constraints */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
            <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="BTC">BTC</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">CPU Manufacturer</label>
            <select value={formData.cpu_mfg} onChange={(e) => setFormData({ ...formData, cpu_mfg: e.target.value })}>
              <option value="">Any</option>
              {Object.values(CpuMfg).map((mfg) => (
                <option key={mfg} value={mfg}>
                  {mfg.charAt(0).toUpperCase() + mfg.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">CPU Architecture</label>
            <select value={formData.cpu_arch} onChange={(e) => setFormData({ ...formData, cpu_arch: e.target.value })}>
              <option value="">Any</option>
              {Object.values(CpuArch).map((arch) => (
                <option key={arch} value={arch}>
                  {arch}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">CPU Features</label>
            <MultiSelect
              options={Object.values(CpuFeature)}
              selected={formData.cpu_features}
              onChange={(features) => setFormData({ ...formData, cpu_features: features })}
              placeholder="Any"
            />
          </div>
        </div>

        {/* Resource costs */}
        <div>
          <p className="text-xs text-gray-400 mb-2">All prices are per month</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                CPU ({formData.currency === "BTC" ? "sats" : formData.currency}/core)
              </label>
              <input
                type="number"
                step={formData.currency === "BTC" ? "1" : "0.01"}
                value={formData.cpu_cost}
                onChange={(e) => setFormData({ ...formData, cpu_cost: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Memory ({formData.currency === "BTC" ? "sats" : formData.currency}/GB)
              </label>
              <input
                type="number"
                step={formData.currency === "BTC" ? "1" : "0.01"}
                value={formData.memory_cost}
                onChange={(e) => setFormData({ ...formData, memory_cost: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                IPv4 ({formData.currency === "BTC" ? "sats" : formData.currency}/IP)
              </label>
              <input
                type="number"
                step={formData.currency === "BTC" ? "1" : "0.01"}
                value={formData.ip4_cost}
                onChange={(e) => setFormData({ ...formData, ip4_cost: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                IPv6 ({formData.currency === "BTC" ? "sats" : formData.currency}/IP)
              </label>
              <input
                type="number"
                step={formData.currency === "BTC" ? "1" : "0.01"}
                value={formData.ip6_cost}
                onChange={(e) => setFormData({ ...formData, ip6_cost: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Resource limits */}
        <div>
          <h4 className="text-lg font-medium text-white mb-3">Resource Limits</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Min CPU Cores</label>
              <input
                type="number"
                max="999"
                value={formData.min_cpu}
                onChange={(e) => setFormData({ ...formData, min_cpu: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Max CPU Cores</label>
              <input
                type="number"
                max="999"
                value={formData.max_cpu}
                onChange={(e) => setFormData({ ...formData, max_cpu: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Min Memory (GB)</label>
              <input
                type="number"
                max="9999"
                value={formData.min_memory}
                onChange={(e) => setFormData({ ...formData, min_memory: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Max Memory (GB)</label>
              <input
                type="number"
                max="9999"
                value={formData.max_memory}
                onChange={(e) => setFormData({ ...formData, max_memory: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* VM resource throttle limits */}
        <div>
          <h4 className="text-lg font-medium text-white mb-1">VM Resource Limits</h4>
          <p className="text-xs text-gray-400 mb-3">Leave blank for uncapped</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">CPU Limit (e.g. 0.5 = 50%)</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={formData.cpu_limit}
                onChange={(e) => setFormData({ ...formData, cpu_limit: e.target.value })}
                placeholder="Uncapped"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Network Bandwidth (Mbit/s)</label>
              <input
                type="number"
                min="0"
                value={formData.network_mbps}
                onChange={(e) => setFormData({ ...formData, network_mbps: e.target.value })}
                placeholder="Uncapped"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Disk Read IOPS</label>
              <input
                type="number"
                min="0"
                value={formData.disk_iops_read}
                onChange={(e) => setFormData({ ...formData, disk_iops_read: e.target.value })}
                placeholder="Uncapped"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Disk Write IOPS</label>
              <input
                type="number"
                min="0"
                value={formData.disk_iops_write}
                onChange={(e) => setFormData({ ...formData, disk_iops_write: e.target.value })}
                placeholder="Uncapped"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Disk Read MB/s</label>
              <input
                type="number"
                min="0"
                value={formData.disk_mbps_read}
                onChange={(e) => setFormData({ ...formData, disk_mbps_read: e.target.value })}
                placeholder="Uncapped"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Disk Write MB/s</label>
              <input
                type="number"
                min="0"
                value={formData.disk_mbps_write}
                onChange={(e) => setFormData({ ...formData, disk_mbps_write: e.target.value })}
                placeholder="Uncapped"
              />
            </div>
          </div>
        </div>

        {/* Disk pricing */}
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
              <div key={index} className="grid grid-cols-2 md:grid-cols-6 gap-3 p-3 bg-slate-700 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <select
                    value={disk.kind}
                    onChange={(e) => updateDiskPricing(index, "kind", e.target.value)}
                    className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  >
                    <option value="hdd">HDD</option>
                    <option value="ssd">SSD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Interface</label>
                  <select
                    value={disk.interface}
                    onChange={(e) => updateDiskPricing(index, "interface", e.target.value)}
                    className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  >
                    <option value="sata">SATA</option>
                    <option value="scsi">SCSI</option>
                    <option value="pcie">PCIe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {formData.currency === "BTC" ? "sats" : formData.currency}/GB
                  </label>
                  <input
                    type="number"
                    step={formData.currency === "BTC" ? "1" : "0.001"}
                    value={disk.cost}
                    onChange={(e) => updateDiskPricing(index, "cost", e.target.value)}
                    className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Min (GB)</label>
                  <input
                    type="number"
                    value={disk.min_disk_size}
                    onChange={(e) => updateDiskPricing(index, "min_disk_size", e.target.value)}
                    className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max (GB)</label>
                  <input
                    type="number"
                    value={disk.max_disk_size}
                    onChange={(e) => updateDiskPricing(index, "max_disk_size", e.target.value)}
                    className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  />
                </div>
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeDiskPricing(index)}
                    className="p-2 text-red-400 hover:text-red-300 rounded disabled:text-gray-600 disabled:cursor-not-allowed"
                    title="Remove disk pricing row"
                    disabled={formData.disk_pricing.length <= 1}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? submittingText : submitText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
