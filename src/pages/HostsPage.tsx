import { ArrowDownTrayIcon, CogIcon, PencilIcon, PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { HostDiskEditor } from "../components/HostDiskEditor";
import { Modal } from "../components/Modal";
import { MultiSelect } from "../components/MultiSelect";
import { PaginatedTable } from "../components/PaginatedTable";
import { Pill } from "../components/Pill";
import { ProxmoxTokenInput } from "../components/ProxmoxTokenInput";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useToast } from "../hooks/useToast";
import type { AdminHostInfo, AdminRegionInfo, AdminUnmanagedVm, AdminUserInfo, VmHostKind } from "../lib/api";
import { CpuArch, CpuFeature, CpuMfg } from "../lib/api";
import { formatBytes } from "../utils/formatBytes";

export function HostsPage() {
  const adminApi = useAdminApi();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDiskEditor, setShowDiskEditor] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedHost, setSelectedHost] = useState<AdminHostInfo | null>(null);
  const [regions, setRegions] = useState<AdminRegionInfo[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
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

  const handleEdit = (host: AdminHostInfo) => {
    setSelectedHost(host);
    setShowEditModal(true);
  };

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleManageDisks = (host: AdminHostInfo) => {
    setSelectedHost(host);
    setShowDiskEditor(true);
  };

  const handleImport = (host: AdminHostInfo) => {
    setSelectedHost(host);
    setShowImportModal(true);
  };

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>Host</th>
      <th>Resources</th>
      <th>Disks</th>
      <th>Load (set / actual)</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (host: AdminHostInfo, index: number) => (
    <tr key={host.id || index}>
      <td className="whitespace-nowrap align-top text-white">{host.id}</td>
      {/* Host: name / kind · region · status / vlan · mtu */}
      <td className="align-top">
        <div className="min-w-0 max-w-[18rem]">
          <div className="truncate font-medium text-white" title={host.name}>
            {host.name}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Pill variant="secondary">{host.kind}</Pill>
            <span
              className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
                host.region.enabled ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
              }`}
            >
              {host.region.enabled ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-400" title={host.region.name}>
            {host.region.name}
          </div>
          {(host.vlan_id || host.mtu) && (
            <div className="mt-0.5 text-xs text-slate-500">
              {host.vlan_id ? `VLAN ${host.vlan_id}` : ""}
              {host.vlan_id && host.mtu ? " · " : ""}
              {host.mtu ? `MTU ${host.mtu}` : ""}
            </div>
          )}
        </div>
      </td>
      {/* Resources: CPU / RAM */}
      <td className="align-top text-gray-300">
        <div className="min-w-0 max-w-[12rem]">
          <div className="truncate">
            <span className="font-medium">{host.cpu}</span> cores
            {(host.cpu_mfg && host.cpu_mfg !== "unknown") || (host.cpu_arch && host.cpu_arch !== "unknown") ? (
              <span className="text-slate-500 text-xs ml-1">
                (
                {[
                  host.cpu_mfg && host.cpu_mfg !== "unknown" ? host.cpu_mfg : null,
                  host.cpu_arch && host.cpu_arch !== "unknown" ? host.cpu_arch : null,
                ]
                  .filter(Boolean)
                  .join(" - ")}
                )
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">{formatBytes(host.memory)} RAM</div>
        </div>
      </td>
      {/* Disks */}
      <td className="align-top text-gray-300">
        <div className="min-w-0 max-w-[16rem] space-y-2">
          <div className="space-y-0.5">
            {host.disks.map((disk, idx) => (
              <div key={idx} className="flex items-center gap-1 text-xs text-slate-400">
                <span className="truncate font-mono text-purple-400" title={disk.name}>
                  {disk.name}
                </span>
                <span className="text-slate-500">{formatBytes(disk.size)}</span>
                <span className="text-slate-500">{disk.kind.toUpperCase()}</span>
                <span className="text-slate-500">{disk.interface.toUpperCase()}</span>
                {!disk.enabled && (
                  <span className="inline-flex px-1 py-0.5 rounded text-red-300 bg-red-900">Disabled</span>
                )}
              </div>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={() => handleManageDisks(host)} className="px-3 py-1 text-xs">
            <CogIcon className="h-3 w-3 mr-1" />
            Manage Disks ({host.disks.length})
          </Button>
        </div>
      </td>
      {/* Load factors + active VMs */}
      <td className="align-top text-gray-300">
        <div className="text-xs space-y-0.5">
          <div>
            CPU {(host.load_cpu * 100).toFixed(0)}% / {(host.calculated_load.cpu_load * 100).toFixed(0)}%
          </div>
          <div>
            RAM {(host.load_memory * 100).toFixed(0)}% / {(host.calculated_load.memory_load * 100).toFixed(0)}%
          </div>
          <div>
            Disk {(host.load_disk * 100).toFixed(0)}% / {(host.calculated_load.disk_load * 100).toFixed(0)}%
          </div>
          <div className="font-medium text-white">Overall {(host.calculated_load.overall_load * 100).toFixed(0)}%</div>
          <div className="mt-1">
            <span
              className={`inline-flex px-1.5 py-0.5 font-medium rounded ${
                host.calculated_load.active_vms > 0 ? "bg-blue-900 text-blue-300" : "bg-gray-600 text-gray-400"
              }`}
            >
              {host.calculated_load.active_vms} VMs
            </span>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap align-top">
        <StatusBadge status={host.enabled ? "enabled" : "disabled"} />
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end gap-1">
          {host.kind === "proxmox" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleImport(host)}
              className="p-1"
              title="Import existing VMs"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => handleEdit(host)} className="p-1" title="Edit host">
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const calculateStats = (hosts: AdminHostInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      enabled: hosts.filter((host) => host.enabled).length,
      disabled: hosts.filter((host) => !host.enabled).length,
      totalCPU: hosts.reduce((sum, host) => sum + host.cpu, 0),
      totalMemory: hosts.reduce((sum, host) => sum + host.memory, 0),
      totalDisks: hosts.reduce((sum, host) => sum + host.disks.length, 0),
      totalDiskSpace: hosts.reduce(
        (sum, host) => sum + host.disks.reduce((diskSum, disk) => diskSum + disk.size, 0),
        0,
      ),
    };

    return (
      <StatsHeader
        title="Hosts"
        stats={[
          { label: "Total", value: stats.total },
          { label: "Enabled", value: stats.enabled, tone: "success" },
          { label: "Disabled", value: stats.disabled, tone: "danger" },
          { label: "CPU", value: `${stats.totalCPU} cores`, tone: "accent" },
          { label: "Memory", value: formatBytes(stats.totalMemory), tone: "purple" },
          { label: "Disks", value: `${stats.totalDisks} (${formatBytes(stats.totalDiskSpace)})`, tone: "orange" },
        ]}
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Create Host
          </Button>
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getHosts(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view hosts"
        loadingMessage="Loading hosts..."
        dependencies={[refreshTrigger]}
        minWidth="900px"
      />

      {/* Create Host Modal */}
      <CreateHostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refreshData}
        regions={regions}
      />

      {/* Edit Host Modal */}
      {selectedHost && (
        <EditHostModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedHost(null);
          }}
          host={selectedHost}
          onSuccess={refreshData}
          regions={regions}
        />
      )}

      {/* Host Disk Editor Modal */}
      {selectedHost && (
        <HostDiskEditor
          isOpen={showDiskEditor}
          onClose={() => {
            setShowDiskEditor(false);
            setSelectedHost(null);
          }}
          host={selectedHost}
          onSuccess={refreshData}
        />
      )}

      {/* Import VM Modal */}
      {selectedHost && (
        <ImportVmModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setSelectedHost(null);
          }}
          host={selectedHost}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

// Create Host Modal Component
function CreateHostModal({
  isOpen,
  onClose,
  onSuccess,
  regions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  regions: AdminRegionInfo[];
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    ip: "",
    api_token: "",
    region_id: "",
    kind: "proxmox",
    vlan_id: "",
    mtu: "",
    cpu: 0,
    cpu_mfg: "",
    cpu_arch: "",
    cpu_features: [] as string[],
    memory: 0,
    enabled: true,
    load_cpu: 1.0,
    load_memory: 1.0,
    load_disk: 1.0,
    ssh_user: "",
    ssh_key: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hostData: any = {
        name: formData.name,
        ip: formData.ip,
        api_token: formData.api_token,
        region_id: parseInt(formData.region_id),
        kind: formData.kind,
        cpu: formData.cpu,
        memory: formData.memory,
        enabled: formData.enabled,
        load_cpu: formData.load_cpu,
        load_memory: formData.load_memory,
        load_disk: formData.load_disk,
      };

      if (formData.vlan_id) {
        hostData.vlan_id = parseInt(formData.vlan_id);
      }
      if (formData.mtu) {
        hostData.mtu = parseInt(formData.mtu);
      }
      if (formData.cpu_mfg) {
        hostData.cpu_mfg = formData.cpu_mfg;
      }
      if (formData.cpu_arch) {
        hostData.cpu_arch = formData.cpu_arch;
      }
      if (formData.cpu_features.length > 0) {
        hostData.cpu_features = formData.cpu_features;
      }
      if (formData.ssh_user) {
        hostData.ssh_user = formData.ssh_user;
      }
      if (formData.ssh_key) {
        hostData.ssh_key = formData.ssh_key;
      }

      await adminApi.createHost(hostData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: "",
        ip: "",
        api_token: "",
        region_id: "",
        kind: "proxmox",
        vlan_id: "",
        mtu: "",
        cpu: 0,
        cpu_mfg: "",
        cpu_arch: "",
        cpu_features: [],
        memory: 0,
        enabled: true,
        load_cpu: 1.0,
        load_memory: 1.0,
        load_disk: 1.0,
        ssh_user: "",
        ssh_key: "",
      });
    } catch (error) {
      console.error("Failed to create host:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Host" size="3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Host Name*</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className=""
              placeholder="Host name"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">IP Address*</label>
            <input
              type="text"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              className=""
              placeholder="192.168.1.100"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Region*</label>
            <select
              value={formData.region_id}
              onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
              className=""
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
          <div>
            <label className="block text-xs font-medium text-white mb-2">Host Type*</label>
            <select
              value={formData.kind}
              onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
              className=""
              required
            >
              <option value="proxmox">Proxmox</option>
              <option value="libvirt">Libvirt</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">API Token*</label>
          {formData.kind === "proxmox" ? (
            <ProxmoxTokenInput
              value={formData.api_token}
              onChange={(token) => setFormData({ ...formData, api_token: token })}
              required
            />
          ) : (
            <input
              type="text"
              value={formData.api_token}
              onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
              className=""
              placeholder="API token for host communication"
              required
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">CPU Cores*</label>
            <input
              type="number"
              min="1"
              value={formData.cpu}
              onChange={(e) => setFormData({ ...formData, cpu: parseInt(e.target.value) || 0 })}
              className=""
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Memory (GB)*</label>
            <input
              type="number"
              min="1"
              value={formData.memory ? Math.round(formData.memory / (1024 * 1024 * 1024)) : 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  memory: (parseInt(e.target.value) || 0) * 1024 * 1024 * 1024,
                })
              }
              className=""
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">VLAN ID</label>
            <input
              type="number"
              value={formData.vlan_id}
              onChange={(e) => setFormData({ ...formData, vlan_id: e.target.value })}
              className=""
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">CPU Manufacturer</label>
            <select
              value={formData.cpu_mfg}
              onChange={(e) => setFormData({ ...formData, cpu_mfg: e.target.value })}
              className=""
            >
              <option value="">Select...</option>
              {Object.values(CpuMfg).map((mfg) => (
                <option key={mfg} value={mfg}>
                  {mfg.charAt(0).toUpperCase() + mfg.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">CPU Architecture</label>
            <select
              value={formData.cpu_arch}
              onChange={(e) => setFormData({ ...formData, cpu_arch: e.target.value })}
              className=""
            >
              <option value="">Select...</option>
              {Object.values(CpuArch).map((arch) => (
                <option key={arch} value={arch}>
                  {arch}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">CPU Features</label>
            <MultiSelect
              options={Object.values(CpuFeature)}
              selected={formData.cpu_features}
              onChange={(features) => setFormData({ ...formData, cpu_features: features })}
              placeholder="Any"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">MTU</label>
            <input
              type="number"
              value={formData.mtu}
              onChange={(e) => setFormData({ ...formData, mtu: e.target.value })}
              className=""
              placeholder="1500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">SSH User</label>
            <input
              type="text"
              value={formData.ssh_user}
              onChange={(e) => setFormData({ ...formData, ssh_user: e.target.value })}
              className=""
              placeholder="root"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">SSH Key</label>
            <textarea
              value={formData.ssh_key}
              onChange={(e) => setFormData({ ...formData, ssh_key: e.target.value })}
              className="min-h-[80px]"
              placeholder="SSH private key (optional)"
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-white mb-2">Load Factors</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">CPU Load (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="500"
                value={Math.round(formData.load_cpu * 100)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    load_cpu: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
                className=""
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">Memory Load (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="500"
                value={Math.round(formData.load_memory * 100)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    load_memory: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
                className=""
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">Disk Load (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="500"
                value={Math.round(formData.load_disk * 100)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    load_disk: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
                className=""
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled-create"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className=""
          />
          <label htmlFor="enabled-create" className="ml-2 text-xs text-white">
            Host Enabled
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Host"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Host Modal Component
function EditHostModal({
  isOpen,
  onClose,
  host,
  onSuccess,
  regions,
}: {
  isOpen: boolean;
  onClose: () => void;
  host: AdminHostInfo;
  onSuccess: () => void;
  regions: AdminRegionInfo[];
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: host.name || "",
    ip: host.ip || "",
    api_token: "", // Don't pre-fill for security
    region_id: host.region.id.toString(),
    kind: host.kind || "proxmox",
    vlan_id: host.vlan_id?.toString() || "",
    mtu: host.mtu?.toString() || "",
    cpu_mfg: host.cpu_mfg || "",
    cpu_arch: host.cpu_arch || "",
    cpu_features: host.cpu_features || [],
    enabled: host.enabled,
    load_cpu: host.load_cpu,
    load_memory: host.load_memory,
    load_disk: host.load_disk,
    ssh_user: host.ssh_user || "",
    ssh_key: "", // Don't pre-fill for security
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: any = {
        name: formData.name || undefined,
        ip: formData.ip || undefined,
        region_id: parseInt(formData.region_id) || undefined,
        kind: formData.kind || undefined,
        vlan_id: formData.vlan_id ? parseInt(formData.vlan_id) : null,
        mtu: formData.mtu ? parseInt(formData.mtu) : null,
        enabled: formData.enabled,
        load_cpu: formData.load_cpu,
        load_memory: formData.load_memory,
        load_disk: formData.load_disk,
      };

      // Only include API token if it was entered
      if (formData.api_token) {
        updates.api_token = formData.api_token;
      }
      if (formData.cpu_mfg) {
        updates.cpu_mfg = formData.cpu_mfg;
      }
      if (formData.cpu_arch) {
        updates.cpu_arch = formData.cpu_arch;
      }
      updates.cpu_features = formData.cpu_features.length > 0 ? formData.cpu_features : [];
      if (formData.ssh_user) {
        updates.ssh_user = formData.ssh_user;
      }
      if (formData.ssh_key) {
        updates.ssh_key = formData.ssh_key;
      }

      await adminApi.updateHost(host.id, updates);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update host:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Host" size="3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Host Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className=""
              placeholder="Host name"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">IP Address</label>
            <input
              type="text"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              className=""
              placeholder="192.168.1.100"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Region</label>
            <select
              value={formData.region_id}
              onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
              className=""
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
          <div>
            <label className="block text-xs font-medium text-white mb-2">Host Type</label>
            <select
              value={formData.kind}
              onChange={(e) => setFormData({ ...formData, kind: e.target.value as VmHostKind })}
              className=""
              required
            >
              <option value="proxmox">Proxmox</option>
              <option value="libvirt">Libvirt</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">API Token</label>
          {formData.kind === "proxmox" ? (
            <ProxmoxTokenInput
              value={formData.api_token}
              onChange={(token) => setFormData({ ...formData, api_token: token })}
            />
          ) : (
            <input
              type="text"
              value={formData.api_token}
              onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
              className=""
              placeholder="Leave empty to keep current token"
            />
          )}
          <p className="text-xs text-gray-400 mt-1">Leave empty to keep current token</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">VLAN ID</label>
            <input
              type="number"
              value={formData.vlan_id}
              onChange={(e) => setFormData({ ...formData, vlan_id: e.target.value })}
              className=""
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">MTU</label>
            <input
              type="number"
              value={formData.mtu}
              onChange={(e) => setFormData({ ...formData, mtu: e.target.value })}
              className=""
              placeholder="1500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">CPU Manufacturer</label>
            <select
              value={formData.cpu_mfg}
              onChange={(e) => setFormData({ ...formData, cpu_mfg: e.target.value })}
              className=""
            >
              <option value="">Select...</option>
              {Object.values(CpuMfg).map((mfg) => (
                <option key={mfg} value={mfg}>
                  {mfg.charAt(0).toUpperCase() + mfg.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">CPU Architecture</label>
            <select
              value={formData.cpu_arch}
              onChange={(e) => setFormData({ ...formData, cpu_arch: e.target.value })}
              className=""
            >
              <option value="">Select...</option>
              {Object.values(CpuArch).map((arch) => (
                <option key={arch} value={arch}>
                  {arch}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">CPU Features</label>
            <MultiSelect
              options={Object.values(CpuFeature)}
              selected={formData.cpu_features}
              onChange={(features) => setFormData({ ...formData, cpu_features: features })}
              placeholder="Any"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">SSH User</label>
            <input
              type="text"
              value={formData.ssh_user}
              onChange={(e) => setFormData({ ...formData, ssh_user: e.target.value })}
              className=""
              placeholder="root"
            />
            {host.ssh_key_configured && <p className="text-xs text-green-400 mt-1">SSH key is configured</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">SSH Key</label>
            <textarea
              value={formData.ssh_key}
              onChange={(e) => setFormData({ ...formData, ssh_key: e.target.value })}
              className="min-h-[80px]"
              placeholder="Leave empty to keep current key"
            />
            <p className="text-xs text-gray-400 mt-1">Leave empty to keep current key</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-white mb-2">Load Factors</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">CPU Load (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="500"
                value={Math.round(formData.load_cpu * 100)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    load_cpu: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
                className=""
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">Memory Load (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="500"
                value={Math.round(formData.load_memory * 100)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    load_memory: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
                className=""
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">Disk Load (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="500"
                value={Math.round(formData.load_disk * 100)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    load_disk: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
                className=""
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled-edit"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className=""
          />
          <label htmlFor="enabled-edit" className="ml-2 text-xs text-white">
            Host Enabled
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Host"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Import VM Modal Component
function ImportVmModal({
  isOpen,
  onClose,
  host,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  host: AdminHostInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [unmanaged, setUnmanaged] = useState<AdminUnmanagedVm[] | null>(null);
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [selectedVmId, setSelectedVmId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");

  // Load users once when opened
  useEffect(() => {
    if (!isOpen) return;
    adminApi
      .getUsers({ limit: 1000 })
      .then((res) => setUsers(res.data))
      .catch((err) => console.error("Failed to load users:", err));
  }, [isOpen]);

  // Reset state when reopened for a different host
  useEffect(() => {
    if (isOpen) {
      setUnmanaged(null);
      setSelectedVmId(null);
      setUserId("");
      setReason("");
      setDiscoverError(null);
    }
  }, [isOpen, host.id]);

  const discover = async () => {
    setDiscovering(true);
    setDiscoverError(null);
    try {
      const vms = await adminApi.getUnmanagedVms(host.id);
      setUnmanaged(vms);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "Failed to discover unmanaged VMs");
    } finally {
      setDiscovering(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVmId == null || !userId) return;
    setLoading(true);
    try {
      const res = await adminApi.importVm(host.id, {
        host_vm_id: selectedVmId,
        user_id: parseInt(userId, 10),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      success(`VM import job dispatched (Job ID: ${res.job_id}). Follow progress in Job History.`);
      onSuccess();
      onClose();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to import VM");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Import VMs — ${host.name}`} size="2xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Discover VMs running on this host that are not tracked in the database and import one, assigning it to a user.
          Billing uses the region's custom pricing (required). Discovery dispatches a worker job and may take up to ~30s.
          Proxmox hosts only.
        </p>

        {!unmanaged && (
          <div className="flex items-center gap-3">
            <Button onClick={discover} disabled={discovering}>
              {discovering ? "Discovering..." : "Discover Unmanaged VMs"}
            </Button>
            {discoverError && <span className="text-sm text-red-400">{discoverError}</span>}
          </div>
        )}

        {unmanaged && unmanaged.length === 0 && (
          <div className="rounded-md border border-gray-700 bg-gray-800 p-4 text-sm text-gray-300">
            No unmanaged VMs found on this host.
            <button type="button" onClick={discover} className="ml-2 text-blue-400 hover:underline">
              Retry
            </button>
          </div>
        )}

        {unmanaged && unmanaged.length > 0 && (
          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-medium text-white">Select VM to import *</label>
                <button type="button" onClick={discover} className="text-xs text-blue-400 hover:underline">
                  {discovering ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border border-gray-700">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-800 text-left text-xs uppercase tracking-wider text-gray-400">
                    <tr>
                      <th className="px-2 py-1.5"></th>
                      <th className="px-2 py-1.5">VM ID</th>
                      <th className="px-2 py-1.5">DB ID</th>
                      <th className="px-2 py-1.5">Name</th>
                      <th className="px-2 py-1.5">CPU</th>
                      <th className="px-2 py-1.5">RAM</th>
                      <th className="px-2 py-1.5">Disk</th>
                      <th className="px-2 py-1.5">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {unmanaged.map((vm) => (
                      <tr
                        key={vm.host_vm_id}
                        className={`cursor-pointer hover:bg-gray-800 ${
                          selectedVmId === vm.host_vm_id ? "bg-blue-900/40" : ""
                        }`}
                        onClick={() => setSelectedVmId(vm.host_vm_id)}
                      >
                        <td className="px-2 py-1.5">
                          <input
                            type="radio"
                            name="unmanaged-vm"
                            checked={selectedVmId === vm.host_vm_id}
                            onChange={() => setSelectedVmId(vm.host_vm_id)}
                          />
                        </td>
                        <td className="px-2 py-1.5 font-mono text-white">{vm.host_vm_id}</td>
                        <td className="px-2 py-1.5 font-mono text-gray-400">{vm.mapped_vm_id ?? "—"}</td>
                        <td className="px-2 py-1.5 text-gray-300">{vm.name ?? "—"}</td>
                        <td className="px-2 py-1.5 text-gray-300">{vm.cpu}</td>
                        <td className="px-2 py-1.5 text-gray-300">{formatBytes(vm.memory)}</td>
                        <td className="px-2 py-1.5 text-gray-300">{formatBytes(vm.disk_size)}</td>
                        <td className="px-2 py-1.5">
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
                              vm.running ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"
                            }`}
                          >
                            {vm.running ? "running" : "stopped"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-white">
                <UserIcon className="mr-2 inline h-4 w-4" />
                Assign to User *
              </label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Select a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email || `${user.pubkey.slice(0, 16)}...`} (ID: {user.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-white">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Recorded in VM history metadata"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || selectedVmId == null || !userId}>
                {loading ? "Importing..." : "Import VM"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
