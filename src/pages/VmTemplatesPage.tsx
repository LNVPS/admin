import { PencilIcon, PlusIcon, ServerIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import {
  type AdminCostPlanInfo,
  type AdminRegionInfo,
  type AdminVmTemplateInfo,
  DiskInterface,
  DiskType,
} from "../lib/api";
import { formatBytes } from "../utils/formatBytes";

export function VmTemplatesPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
    setShowEditModal(true);
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
      <th>Resources</th>
      <th>Storage</th>
      <th>Region</th>
      <th>Active VMs</th>
      <th>Status</th>
      <th>Info</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (template: AdminVmTemplateInfo, index: number) => (
    <tr key={template.id || index}>
      <td className="whitespace-nowrap text-white">{template.id}</td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="font-medium text-white">{template.name}</div>
          {template.cost_plan_name && <div className="text-blue-400">{template.cost_plan_name}</div>}
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="text-gray-300">
            <span className="font-medium">{template.cpu}</span> CPU cores
          </div>
          <div className="text-gray-300">
            <span className="font-medium">{formatBytes(template.memory)}</span> RAM
          </div>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="text-gray-300">
            <span className="font-medium">{formatBytes(template.disk_size)}</span>
          </div>
          <div className="text-gray-400">
            {template.disk_type.toUpperCase()} • {template.disk_interface.toUpperCase()}
          </div>
        </div>
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
        <Button onClick={() => setShowCreateModal(true)}>
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

      {/* Create VM Template Modal */}
      <CreateVmTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refreshData}
        regions={regions}
        costPlans={costPlans}
      />

      {/* Edit VM Template Modal */}
      {selectedTemplate && (
        <EditVmTemplateModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate}
          onSuccess={refreshData}
          regions={regions}
          costPlans={costPlans}
        />
      )}
    </>
  );
}

// Create VM Template Modal Component
interface CreateVmTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  regions: AdminRegionInfo[];
  costPlans: AdminCostPlanInfo[];
}

function CreateVmTemplateModal({ isOpen, onClose, onSuccess, regions, costPlans }: CreateVmTemplateModalProps) {
  const adminApi = useAdminApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createNewCostPlan, setCreateNewCostPlan] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    enabled: true,
    expires: "",
    cpu: 1,
    memory: 1073741824, // 1GB in bytes
    disk_size: 21474836480, // 20GB in bytes
    disk_type: DiskType.SSD,
    disk_interface: DiskInterface.PCIE,
    cost_plan_id: 1,
    region_id: 1,
    // Cost plan auto-creation fields
    cost_plan_name: "",
    cost_plan_amount: 0,
    cost_plan_currency: "USD",
    cost_plan_interval_amount: 1,
    cost_plan_interval_type: "month" as "day" | "month" | "year",
  });

  useEffect(() => {
    if (regions.length > 0 && costPlans.length > 0) {
      setFormData((prev) => ({
        ...prev,
        region_id: regions[0].id,
        cost_plan_id: costPlans[0].id,
      }));
    }
  }, [regions, costPlans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData: any = {
        name: formData.name,
        enabled: formData.enabled,
        expires: formData.expires || null,
        cpu: formData.cpu,
        memory: formData.memory,
        disk_size: formData.disk_size,
        disk_type: formData.disk_type,
        disk_interface: formData.disk_interface,
        region_id: formData.region_id,
      };

      if (createNewCostPlan) {
        // Auto-create cost plan
        submitData.cost_plan_name = formData.cost_plan_name || `${formData.name} Cost Plan`;
        submitData.cost_plan_amount = formData.cost_plan_amount;
        submitData.cost_plan_currency = formData.cost_plan_currency;
        submitData.cost_plan_interval_amount = formData.cost_plan_interval_amount;
        submitData.cost_plan_interval_type = formData.cost_plan_interval_type;
      } else {
        // Use existing cost plan
        submitData.cost_plan_id = formData.cost_plan_id;
      }

      await adminApi.createVmTemplate(submitData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: "",
        enabled: true,
        expires: "",
        cpu: 1,
        memory: 1073741824,
        disk_size: 21474836480,
        disk_type: DiskType.SSD,
        disk_interface: DiskInterface.PCIE,
        cost_plan_id: costPlans.length > 0 ? costPlans[0].id : 1,
        region_id: regions.length > 0 ? regions[0].id : 1,
        cost_plan_name: "",
        cost_plan_amount: 0,
        cost_plan_currency: "USD",
        cost_plan_interval_amount: 1,
        cost_plan_interval_type: "month" as "day" | "month" | "year",
      });
    } catch (error) {
      console.error("Failed to create template:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create VM Template"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="create-template-form" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Template"}
          </Button>
        </>
      }
    >
      <form id="create-template-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Template Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            placeholder="e.g., Basic Ubuntu Server"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">CPU Cores *</label>
            <input
              type="number"
              min="1"
              required
              value={formData.cpu}
              onChange={(e) => setFormData({ ...formData, cpu: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Memory (GB) *</label>
            <input
              type="number"
              min="1"
              required
              value={Math.round(formData.memory / (1024 * 1024 * 1024))}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  memory: (parseInt(e.target.value) || 1) * 1024 * 1024 * 1024,
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Disk Size (GB) *</label>
            <input
              type="number"
              min="10"
              required
              value={Math.round(formData.disk_size / (1024 * 1024 * 1024))}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  disk_size: (parseInt(e.target.value) || 20) * 1024 * 1024 * 1024,
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Disk Type *</label>
            <select
              required
              value={formData.disk_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  disk_type: e.target.value as DiskType,
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  disk_interface: e.target.value as DiskInterface,
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
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
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
          >
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cost Plan Section */}
        <div className="space-y-4 border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Cost Plan</h3>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Create new:</label>
              <input
                type="checkbox"
                checked={createNewCostPlan}
                onChange={(e) => setCreateNewCostPlan(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>

          {createNewCostPlan ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cost Plan Name</label>
                <input
                  type="text"
                  value={formData.cost_plan_name}
                  onChange={(e) => setFormData({ ...formData, cost_plan_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                  placeholder="Leave empty to auto-generate from template name"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.cost_plan_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cost_plan_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Currency *</label>
                  <select
                    required
                    value={formData.cost_plan_currency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cost_plan_currency: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="1-day">Daily</option>
                    <option value="1-month">Monthly</option>
                    <option value="1-year">Yearly</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Existing Cost Plan *</label>
              <select
                required={!createNewCostPlan}
                value={formData.cost_plan_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cost_plan_id: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
              >
                {costPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {plan.amount} {plan.currency}/{plan.interval_amount} {plan.interval_type}(s)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Expires (optional)</label>
          <input
            type="datetime-local"
            value={formData.expires}
            onChange={(e) => setFormData({ ...formData, expires: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enabled" className="ml-2 text-sm text-gray-300">
            Template enabled
          </label>
        </div>
      </form>
    </Modal>
  );
}

// Edit VM Template Modal Component
interface EditVmTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: AdminVmTemplateInfo;
  onSuccess: () => void;
  regions: AdminRegionInfo[];
  costPlans: AdminCostPlanInfo[];
}

function EditVmTemplateModal({ isOpen, onClose, template, onSuccess, regions }: EditVmTemplateModalProps) {
  const adminApi = useAdminApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCostPlan, setLoadingCostPlan] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    enabled: true,
    expires: "",
    cpu: 1,
    memory: 1073741824,
    disk_size: 21474836480,
    disk_type: DiskType.SSD,
    disk_interface: DiskInterface.PCIE,
    region_id: 1,
    // Inline cost plan editing
    cost_plan_name: "",
    cost_plan_amount: 0,
    cost_plan_currency: "USD",
    cost_plan_interval_amount: 1,
    cost_plan_interval_type: "month" as "day" | "month" | "year",
  });

  useEffect(() => {
    if (template) {
      setFormData((prev) => ({
        ...prev,
        name: template.name,
        enabled: template.enabled,
        expires: template.expires ? new Date(template.expires).toISOString().slice(0, 16) : "",
        cpu: template.cpu,
        memory: template.memory,
        disk_size: template.disk_size,
        disk_type: template.disk_type,
        disk_interface: template.disk_interface,
        region_id: template.region_id,
        cost_plan_name: template.cost_plan_name || "",
      }));

      // Fetch the actual cost plan to populate the editing fields
      setLoadingCostPlan(true);
      adminApi
        .getCostPlan(template.cost_plan_id)
        .then((plan) => {
          setFormData((prev) => ({
            ...prev,
            cost_plan_name: plan.name,
            cost_plan_amount: plan.amount,
            cost_plan_currency: plan.currency,
            cost_plan_interval_amount: plan.interval_amount,
            cost_plan_interval_type: plan.interval_type,
          }));
        })
        .catch((err) => {
          console.error("Failed to load cost plan:", err);
        })
        .finally(() => {
          setLoadingCostPlan(false);
        });
    }
  }, [template, adminApi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await adminApi.updateVmTemplate(template.id, {
        name: formData.name,
        enabled: formData.enabled,
        expires: formData.expires || null,
        cpu: formData.cpu,
        memory: formData.memory,
        disk_size: formData.disk_size,
        disk_type: formData.disk_type,
        disk_interface: formData.disk_interface,
        region_id: formData.region_id,
        cost_plan_name: formData.cost_plan_name,
        cost_plan_amount: formData.cost_plan_amount,
        cost_plan_currency: formData.cost_plan_currency,
        cost_plan_interval_amount: formData.cost_plan_interval_amount,
        cost_plan_interval_type: formData.cost_plan_interval_type,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update template:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit VM Template: ${template.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-template-form" disabled={isSubmitting || loadingCostPlan}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </>
      }
    >
      <form id="edit-template-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Template Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">CPU Cores *</label>
            <input
              type="number"
              min="1"
              required
              value={formData.cpu}
              onChange={(e) => setFormData({ ...formData, cpu: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Memory (GB) *</label>
            <input
              type="number"
              min="1"
              required
              value={Math.round(formData.memory / (1024 * 1024 * 1024))}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  memory: (parseInt(e.target.value) || 1) * 1024 * 1024 * 1024,
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Disk Size (GB) *</label>
            <input
              type="number"
              min="10"
              required
              value={Math.round(formData.disk_size / (1024 * 1024 * 1024))}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  disk_size: (parseInt(e.target.value) || 20) * 1024 * 1024 * 1024,
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Disk Type *</label>
            <select
              required
              value={formData.disk_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  disk_type: e.target.value as DiskType,
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  disk_interface: e.target.value as DiskInterface,
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
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
            onChange={(e) =>
              setFormData({
                ...formData,
                region_id: parseInt(e.target.value),
              })
            }
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
          >
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

        {/* Inline Cost Plan Editing */}
        <div className="space-y-4 border-t border-gray-700 pt-4">
          <h3 className="text-lg font-medium text-white">Cost Plan</h3>

          {loadingCostPlan ? (
            <div className="text-sm text-gray-400">Loading cost plan...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cost Plan Name *</label>
                <input
                  type="text"
                  required
                  value={formData.cost_plan_name}
                  onChange={(e) => setFormData({ ...formData, cost_plan_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.cost_plan_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cost_plan_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Currency *</label>
                  <select
                    required
                    value={formData.cost_plan_currency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cost_plan_currency: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
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
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled-edit"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enabled-edit" className="ml-2 text-sm text-gray-300">
            Template enabled
          </label>
        </div>
      </form>
    </Modal>
  );
}
