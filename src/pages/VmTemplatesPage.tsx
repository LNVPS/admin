import { PencilIcon, PlusIcon, ServerIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { MultiSelect } from "../components/MultiSelect";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import {
  type AdminCostPlanInfo,
  type AdminRegionInfo,
  type AdminVmTemplateInfo,
  CpuArch,
  CpuFeature,
  CpuMfg,
  DiskInterface,
  DiskType,
} from "../lib/api";
import { formatCurrency, fromSmallestUnits, toSmallestUnits } from "../utils/currency";
import { formatBytes } from "../utils/formatBytes";

export function VmTemplatesPage() {
  const adminApi = useAdminApi();
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AdminVmTemplateInfo | null>(null);
  const [regions, setRegions] = useState<AdminRegionInfo[]>([]);
  const [costPlans, setCostPlans] = useState<AdminCostPlanInfo[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [regionsResponse, costPlansResponse] = await Promise.all([
          adminApi.getRegions({ limit: 100 }),
          adminApi.getCostPlans({ limit: 100 }),
        ]);
        setRegions(regionsResponse.data);
        setCostPlans(costPlansResponse.data);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };
    loadData();
  }, [adminApi]);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (template: AdminVmTemplateInfo) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTemplate(null);
  };

  const handleDelete = async (template: AdminVmTemplateInfo) => {
    if (template.active_vm_count > 0) {
      alert(`Cannot delete template "${template.name}" because it has ${template.active_vm_count} active VMs.`);
      return;
    }
    if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      try {
        await adminApi.deleteVmTemplate(template.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete template:", error);
      }
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>Template Name</th>
      <th>Cost Plan</th>
      <th>Resources</th>
      <th>Storage</th>
      <th>Constraints</th>
      <th>Resource Limits</th>
      <th>Region</th>
      <th>Active VMs</th>
      <th>Status</th>
      <th>Info</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (template: AdminVmTemplateInfo, index: number) => {
    const costPlan = costPlans.find((p) => p.id === template.cost_plan_id);
    return (
      <tr key={template.id || index}>
        <td className="whitespace-nowrap text-white">{template.id}</td>
        <td className="text-gray-300">
          <div className="font-medium text-white">{template.name}</div>
        </td>
        <td className="text-gray-300">
          {costPlan ? (
            <div className="space-y-0.5">
              <div className="font-medium text-white">
                {formatCurrency(costPlan.amount, costPlan.currency)}/
                {costPlan.interval_amount === 1
                  ? costPlan.interval_type
                  : `${costPlan.interval_amount} ${costPlan.interval_type}s`}
              </div>
              <div className="text-gray-400 text-xs">{costPlan.name}</div>
            </div>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </td>
        <td className="text-gray-300">
          <div className="space-y-0.5">
            <div>
              <span className="font-medium">{template.cpu}</span> CPU cores
            </div>
            <div>
              <span className="font-medium">{formatBytes(template.memory)}</span> RAM
            </div>
          </div>
        </td>
        <td className="text-gray-300">
          <div className="space-y-0.5">
            <div className="font-medium">{formatBytes(template.disk_size)}</div>
            <div className="text-gray-400">
              {template.disk_type.toUpperCase()} • {template.disk_interface.toUpperCase()}
            </div>
          </div>
        </td>
        <td className="text-gray-300">
          {(template.cpu_mfg && template.cpu_mfg !== "unknown") ||
          (template.cpu_arch && template.cpu_arch !== "unknown") ||
          (template.cpu_features && template.cpu_features.length > 0) ? (
            <div className="space-y-0.5">
              {((template.cpu_mfg && template.cpu_mfg !== "unknown") ||
                (template.cpu_arch && template.cpu_arch !== "unknown")) && (
                <div className="text-gray-400 text-xs">
                  {[
                    template.cpu_mfg && template.cpu_mfg !== "unknown" ? template.cpu_mfg : null,
                    template.cpu_arch && template.cpu_arch !== "unknown" ? template.cpu_arch : null,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </div>
              )}
              {template.cpu_features && template.cpu_features.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {template.cpu_features.slice(0, 3).map((feature, idx) => (
                    <span key={idx} className="text-xs bg-gray-700 text-gray-300 px-1 py-0.5 rounded">
                      {feature}
                    </span>
                  ))}
                  {template.cpu_features.length > 3 && (
                    <span className="text-xs text-gray-500">+{template.cpu_features.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </td>
        <td className="text-gray-300">
          {template.disk_iops_read != null ||
          template.disk_iops_write != null ||
          template.disk_mbps_read != null ||
          template.disk_mbps_write != null ||
          template.network_mbps != null ||
          template.cpu_limit != null ? (
            <div className="space-y-0.5 text-xs">
              {template.cpu_limit != null && <div>CPU: {template.cpu_limit * 100}%</div>}
              {template.network_mbps != null && <div>Net: {template.network_mbps} Mbps</div>}
              {(template.disk_iops_read != null || template.disk_iops_write != null) && (
                <div>
                  IOPS: {template.disk_iops_read ?? "∞"}r / {template.disk_iops_write ?? "∞"}w
                </div>
              )}
              {(template.disk_mbps_read != null || template.disk_mbps_write != null) && (
                <div>
                  MB/s: {template.disk_mbps_read ?? "∞"}r / {template.disk_mbps_write ?? "∞"}w
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </td>
        <td className="text-gray-300">
          <div className="text-white">{template.region_name || `Region ${template.region_id}`}</div>
        </td>
        <td className="text-gray-300">
          <div className="flex items-center">
            <ServerIcon className="h-4 w-4 mr-1 text-gray-400" />
            <span className="font-medium">{template.active_vm_count}</span>
          </div>
        </td>
        <td>
          <div className="space-y-1">
            <StatusBadge status={template.enabled ? "enabled" : "disabled"} />
            {template.expires && new Date(template.expires) < new Date() && (
              <div>
                <StatusBadge status="expired" />
              </div>
            )}
          </div>
        </td>
        <td>
          <div className="space-y-0.5">
            <div className="text-gray-400">Created: {new Date(template.created).toLocaleDateString()}</div>
            {template.expires && (
              <div className="text-gray-500">Expires: {new Date(template.expires).toLocaleDateString()}</div>
            )}
          </div>
        </td>
        <td className="text-right">
          <div className="flex justify-end space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleEdit(template)}
              className="p-1 text-blue-400 hover:text-blue-300"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleDelete(template)}
              className="p-1 text-red-400 hover:text-red-300"
              disabled={template.active_vm_count > 0}
              title={template.active_vm_count > 0 ? "Cannot delete template with active VMs" : "Delete template"}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const calculateStats = (templates: AdminVmTemplateInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      enabled: templates.filter((t) => t.enabled).length,
      disabled: templates.filter((t) => !t.enabled).length,
      expired: templates.filter((t) => t.expires && new Date(t.expires) < new Date()).length,
      totalActiveVMs: templates.reduce((sum, t) => sum + t.active_vm_count, 0),
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">VM Templates</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total: <span className="text-white font-medium">{stats.total}</span>
            </span>
            <span>
              Enabled: <span className="text-green-400 font-medium">{stats.enabled}</span>
            </span>
            <span>
              Disabled: <span className="text-red-400 font-medium">{stats.disabled}</span>
            </span>
            <span>
              Expired: <span className="text-orange-400 font-medium">{stats.expired}</span>
            </span>
            <span>
              Active VMs: <span className="text-purple-400 font-medium">{stats.totalActiveVMs}</span>
            </span>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>
    );
  };

  return (
    <>
      <PaginatedTable
        apiCall={(params) => adminApi.getVmTemplates(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        calculateStats={calculateStats}
        itemsPerPage={15}
        errorAction="view VM templates"
        loadingMessage="Loading VM templates..."
        dependencies={[refreshTrigger]}
        minWidth="1400px"
      />

      <VmTemplateModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={refreshData}
        template={selectedTemplate}
        regions={regions}
        costPlans={costPlans}
      />
    </>
  );
}

// Unified VM Template Modal (create + edit)
interface VmTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template: AdminVmTemplateInfo | null; // null = create mode
  regions: AdminRegionInfo[];
  costPlans: AdminCostPlanInfo[];
}

const emptyForm = {
  name: "",
  enabled: true,
  expires: "",
  cpu: "1",
  cpu_mfg: "",
  cpu_arch: "",
  cpu_features: [] as string[],
  memory: "1",
  disk_size: "20",
  disk_type: DiskType.SSD,
  disk_interface: DiskInterface.PCIE,
  region_id: 0,
  // Cost plan
  create_new_cost_plan: true,
  cost_plan_id: 0,
  cost_plan_name: "",
  cost_plan_amount: "0",
  cost_plan_currency: "USD",
  cost_plan_interval_amount: 1,
  cost_plan_interval_type: "month" as "day" | "month" | "year",
  // Resource limits (empty string = uncapped)
  cpu_limit: "",
  network_mbps: "",
  disk_iops_read: "",
  disk_iops_write: "",
  disk_mbps_read: "",
  disk_mbps_write: "",
};

function VmTemplateModal({ isOpen, onClose, onSuccess, template, regions, costPlans }: VmTemplateModalProps) {
  const adminApi = useAdminApi();
  const isEdit = template !== null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCostPlan, setLoadingCostPlan] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  // Populate form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (template) {
      // Edit mode — populate from template
      setFormData({
        ...emptyForm,
        name: template.name,
        enabled: template.enabled,
        expires: template.expires ? new Date(template.expires).toISOString().slice(0, 16) : "",
        cpu: template.cpu.toString(),
        cpu_mfg: template.cpu_mfg || "",
        cpu_arch: template.cpu_arch || "",
        cpu_features: template.cpu_features || [],
        memory: Math.round(template.memory / (1024 * 1024 * 1024)).toString(),
        disk_size: Math.round(template.disk_size / (1024 * 1024 * 1024)).toString(),
        disk_type: template.disk_type,
        disk_interface: template.disk_interface,
        region_id: template.region_id,
        create_new_cost_plan: false,
        cost_plan_id: template.cost_plan_id,
        cost_plan_name: template.cost_plan_name || "",
        cpu_limit: template.cpu_limit != null ? template.cpu_limit.toString() : "",
        network_mbps: template.network_mbps != null ? template.network_mbps.toString() : "",
        disk_iops_read: template.disk_iops_read != null ? template.disk_iops_read.toString() : "",
        disk_iops_write: template.disk_iops_write != null ? template.disk_iops_write.toString() : "",
        disk_mbps_read: template.disk_mbps_read != null ? template.disk_mbps_read.toString() : "",
        disk_mbps_write: template.disk_mbps_write != null ? template.disk_mbps_write.toString() : "",
        // cost_plan amounts loaded async below
        cost_plan_amount: "0",
        cost_plan_currency: "USD",
        cost_plan_interval_amount: 1,
        cost_plan_interval_type: "month",
      });

      // Fetch cost plan details for editing
      setLoadingCostPlan(true);
      adminApi
        .getCostPlan(template.cost_plan_id)
        .then((plan) => {
          setFormData((prev) => ({
            ...prev,
            cost_plan_name: plan.name,
            cost_plan_amount: fromSmallestUnits(plan.amount, plan.currency).toString(),
            cost_plan_currency: plan.currency,
            cost_plan_interval_amount: plan.interval_amount,
            cost_plan_interval_type: plan.interval_type,
          }));
        })
        .catch((err) => console.error("Failed to load cost plan:", err))
        .finally(() => setLoadingCostPlan(false));
    } else {
      // Create mode — reset to defaults, pick first region/cost plan
      setFormData({
        ...emptyForm,
        region_id: regions[0]?.id ?? 0,
        cost_plan_id: costPlans[0]?.id ?? 0,
      });
    }
  }, [isOpen, template, regions, costPlans, adminApi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const resourceLimits = {
        cpu_limit: formData.cpu_limit !== "" ? parseFloat(formData.cpu_limit) : null,
        network_mbps: formData.network_mbps !== "" ? parseInt(formData.network_mbps) : null,
        disk_iops_read: formData.disk_iops_read !== "" ? parseInt(formData.disk_iops_read) : null,
        disk_iops_write: formData.disk_iops_write !== "" ? parseInt(formData.disk_iops_write) : null,
        disk_mbps_read: formData.disk_mbps_read !== "" ? parseInt(formData.disk_mbps_read) : null,
        disk_mbps_write: formData.disk_mbps_write !== "" ? parseInt(formData.disk_mbps_write) : null,
      };

      if (isEdit) {
        const updates: any = {
          name: formData.name,
          enabled: formData.enabled,
          expires: formData.expires || null,
          cpu: parseInt(formData.cpu) || 1,
          cpu_mfg: formData.cpu_mfg || null,
          cpu_arch: formData.cpu_arch || null,
          cpu_features: formData.cpu_features,
          memory: (parseFloat(formData.memory) || 1) * 1024 * 1024 * 1024,
          disk_size: (parseFloat(formData.disk_size) || 20) * 1024 * 1024 * 1024,
          disk_type: formData.disk_type,
          disk_interface: formData.disk_interface,
          region_id: formData.region_id,
          cost_plan_name: formData.cost_plan_name,
          cost_plan_amount: toSmallestUnits(parseFloat(formData.cost_plan_amount) || 0, formData.cost_plan_currency),
          cost_plan_currency: formData.cost_plan_currency,
          cost_plan_interval_amount: formData.cost_plan_interval_amount,
          cost_plan_interval_type: formData.cost_plan_interval_type,
          ...resourceLimits,
        };
        await adminApi.updateVmTemplate(template!.id, updates);
      } else {
        const data: any = {
          name: formData.name,
          enabled: formData.enabled,
          expires: formData.expires || null,
          cpu: parseInt(formData.cpu) || 1,
          memory: (parseFloat(formData.memory) || 1) * 1024 * 1024 * 1024,
          disk_size: (parseFloat(formData.disk_size) || 20) * 1024 * 1024 * 1024,
          disk_type: formData.disk_type,
          disk_interface: formData.disk_interface,
          region_id: formData.region_id,
        };
        if (formData.cpu_mfg) data.cpu_mfg = formData.cpu_mfg;
        if (formData.cpu_arch) data.cpu_arch = formData.cpu_arch;
        if (formData.cpu_features.length > 0) data.cpu_features = formData.cpu_features;

        if (formData.create_new_cost_plan) {
          data.cost_plan_name = formData.cost_plan_name || undefined;
          data.cost_plan_amount = toSmallestUnits(
            parseFloat(formData.cost_plan_amount) || 0,
            formData.cost_plan_currency,
          );
          data.cost_plan_currency = formData.cost_plan_currency;
          data.cost_plan_interval_amount = formData.cost_plan_interval_amount;
          data.cost_plan_interval_type = formData.cost_plan_interval_type;
        } else {
          data.cost_plan_id = formData.cost_plan_id;
        }

        // Only include resource limits if set
        for (const [k, v] of Object.entries(resourceLimits)) {
          if (v !== null) data[k] = v;
        }

        await adminApi.createVmTemplate(data);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save template:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Template: ${template!.name}` : "Create VM Template"}
      size="3xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="vm-template-form" disabled={isSubmitting || (isEdit && loadingCostPlan)}>
            {isSubmitting ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Changes" : "Create Template"}
          </Button>
        </>
      }
    >
      <form id="vm-template-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-6">
          {/* Left column — main config */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Template Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputCls}
                placeholder="e.g., Basic Ubuntu Server"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">CPU Cores *</label>
                <input
                  type="number"
                  required
                  value={formData.cpu}
                  onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Memory (GB) *</label>
                <input
                  type="number"
                  required
                  value={formData.memory}
                  onChange={(e) => setFormData({ ...formData, memory: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">CPU Mfg</label>
                <select
                  value={formData.cpu_mfg}
                  onChange={(e) => setFormData({ ...formData, cpu_mfg: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Any</option>
                  {Object.values(CpuMfg).map((mfg) => (
                    <option key={mfg} value={mfg}>
                      {mfg.charAt(0).toUpperCase() + mfg.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">CPU Arch</label>
                <select
                  value={formData.cpu_arch}
                  onChange={(e) => setFormData({ ...formData, cpu_arch: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Any</option>
                  {Object.values(CpuArch).map((arch) => (
                    <option key={arch} value={arch}>
                      {arch}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">CPU Features</label>
                <MultiSelect
                  options={Object.values(CpuFeature)}
                  selected={formData.cpu_features}
                  onChange={(features) => setFormData({ ...formData, cpu_features: features })}
                  placeholder="Any"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Disk Size (GB) *</label>
                <input
                  type="number"
                  required
                  value={formData.disk_size}
                  onChange={(e) => setFormData({ ...formData, disk_size: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Disk Type *</label>
                <select
                  required
                  value={formData.disk_type}
                  onChange={(e) => setFormData({ ...formData, disk_type: e.target.value as DiskType })}
                  className={inputCls}
                >
                  <option value={DiskType.HDD}>HDD</option>
                  <option value={DiskType.SSD}>SSD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Disk Interface *</label>
                <select
                  required
                  value={formData.disk_interface}
                  onChange={(e) => setFormData({ ...formData, disk_interface: e.target.value as DiskInterface })}
                  className={inputCls}
                >
                  <option value={DiskInterface.SATA}>SATA</option>
                  <option value={DiskInterface.SCSI}>SCSI</option>
                  <option value={DiskInterface.PCIE}>PCIe</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Region *</label>
              <select
                required
                value={formData.region_id}
                onChange={(e) => setFormData({ ...formData, region_id: parseInt(e.target.value) })}
                className={inputCls}
              >
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cost Plan */}
            <div className="space-y-3 border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Cost Plan</h3>
                {!isEdit && (
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-300">Create new:</label>
                    <input
                      type="checkbox"
                      checked={formData.create_new_cost_plan}
                      onChange={(e) => setFormData({ ...formData, create_new_cost_plan: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>

              {!isEdit && !formData.create_new_cost_plan ? (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Existing Cost Plan *</label>
                  <select
                    required
                    value={formData.cost_plan_id}
                    onChange={(e) => setFormData({ ...formData, cost_plan_id: parseInt(e.target.value) })}
                    className={inputCls}
                  >
                    {costPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} — {formatCurrency(plan.amount, plan.currency)}/
                        {plan.interval_amount === 1
                          ? plan.interval_type
                          : `${plan.interval_amount} ${plan.interval_type}s`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : loadingCostPlan ? (
                <div className="text-sm text-gray-400">Loading cost plan...</div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {isEdit ? "Cost Plan Name *" : "Cost Plan Name"}
                    </label>
                    <input
                      type="text"
                      required={isEdit}
                      value={formData.cost_plan_name}
                      onChange={(e) => setFormData({ ...formData, cost_plan_name: e.target.value })}
                      className={inputCls}
                      placeholder={isEdit ? "" : "Auto-generated from template name"}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount ({formData.cost_plan_currency === "BTC" ? "sats" : formData.cost_plan_currency}) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step={formData.cost_plan_currency === "BTC" ? "1" : "0.01"}
                        required
                        value={formData.cost_plan_amount}
                        onChange={(e) => setFormData({ ...formData, cost_plan_amount: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Currency *</label>
                      <select
                        required
                        value={formData.cost_plan_currency}
                        onChange={(e) => setFormData({ ...formData, cost_plan_currency: e.target.value })}
                        className={inputCls}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                        <option value="CHF">CHF</option>
                        <option value="AUD">AUD</option>
                        <option value="JPY">JPY</option>
                        <option value="BTC">BTC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Interval *</label>
                      <select
                        required
                        value={`${formData.cost_plan_interval_amount}-${formData.cost_plan_interval_type}`}
                        onChange={(e) => {
                          const [amount, type] = e.target.value.split("-");
                          setFormData({
                            ...formData,
                            cost_plan_interval_amount: parseInt(amount),
                            cost_plan_interval_type: type as "day" | "month" | "year",
                          });
                        }}
                        className={inputCls}
                      >
                        <option value="1-day">Daily</option>
                        <option value="1-month">Monthly</option>
                        <option value="1-year">Yearly</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Expires (optional)</label>
              <input
                type="datetime-local"
                value={formData.expires}
                onChange={(e) => setFormData({ ...formData, expires: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="vm-template-enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="vm-template-enabled" className="ml-2 text-sm text-gray-300">
                Template enabled
              </label>
            </div>
          </div>

          {/* Right column — resource limits */}
          <div className="space-y-4 pl-6 border-l border-gray-700">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              Resource Limits
              <span className="ml-2 text-xs font-normal normal-case text-gray-400">leave blank for uncapped</span>
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">CPU Limit (e.g. 0.5 = 50%)</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={formData.cpu_limit}
                onChange={(e) => setFormData({ ...formData, cpu_limit: e.target.value })}
                className={inputCls}
                placeholder="Uncapped"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Network Bandwidth (Mbit/s)</label>
              <input
                type="number"
                min="0"
                value={formData.network_mbps}
                onChange={(e) => setFormData({ ...formData, network_mbps: e.target.value })}
                className={inputCls}
                placeholder="Uncapped"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Disk Read IOPS</label>
                <input
                  type="number"
                  min="0"
                  value={formData.disk_iops_read}
                  onChange={(e) => setFormData({ ...formData, disk_iops_read: e.target.value })}
                  className={inputCls}
                  placeholder="Uncapped"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Disk Write IOPS</label>
                <input
                  type="number"
                  min="0"
                  value={formData.disk_iops_write}
                  onChange={(e) => setFormData({ ...formData, disk_iops_write: e.target.value })}
                  className={inputCls}
                  placeholder="Uncapped"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Disk Read MB/s</label>
                <input
                  type="number"
                  min="0"
                  value={formData.disk_mbps_read}
                  onChange={(e) => setFormData({ ...formData, disk_mbps_read: e.target.value })}
                  className={inputCls}
                  placeholder="Uncapped"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Disk Write MB/s</label>
                <input
                  type="number"
                  min="0"
                  value={formData.disk_mbps_write}
                  onChange={(e) => setFormData({ ...formData, disk_mbps_write: e.target.value })}
                  className={inputCls}
                  placeholder="Uncapped"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
