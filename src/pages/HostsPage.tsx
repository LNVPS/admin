import { useState, useEffect } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { Pill } from "../components/Pill";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { AdminHostInfo, AdminRegionInfo } from "../lib/api";
import { formatBytes } from "../utils/formatBytes";
import { PencilIcon, PlusIcon } from "@heroicons/react/24/outline";

export function HostsPage() {
  const adminApi = useAdminApi();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const renderHeader = () => (
    <>
      <th>ID</th>
      <th>Host Details</th>
      <th>Region</th>
      <th>Resources</th>
      <th>Disks</th>
      <th>Load Factors</th>
      <th className="w-12">VMs</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (host: AdminHostInfo, index: number) => (
    <tr key={host.id || index}>
      <td className="whitespace-nowrap text-white">{host.id}</td>
      <td>
        <div className="space-y-1">
          <div className="font-medium text-white">{host.name}</div>
          <div>
            <Pill variant="secondary">{host.kind}</Pill>
          </div>
          {host.vlan_id && (
            <div className="text-gray-500">VLAN: {host.vlan_id}</div>
          )}
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-1">
          <div className="font-medium">{host.region.name}</div>
          <div>
            <span
              className={`inline-flex px-1.5 py-0.5 font-medium rounded ${
                host.region.enabled
                  ? "bg-green-900 text-green-300"
                  : "bg-red-900 text-red-300"
              }`}
            >
              {host.region.enabled ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div>
            <span className="font-medium">{host.cpu}</span>CPU cores
          </div>
          <div>
            <span className="font-medium">{formatBytes(host.memory)}</span> RAM
          </div>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          {host.disks.map((disk, idx) => (
            <div
              key={idx}
              className="text-gray-400 flex items-center gap-1 flex-wrap"
            >
              <span className="font-mono text-purple-400">{disk.name}</span>
              <span className="text-gray-500">{formatBytes(disk.size)}</span>
              <span className="text-gray-500">{disk.kind.toUpperCase()}</span>
              <span className="text-gray-500">
                {disk.interface.toUpperCase()}
              </span>
              {!disk.enabled && (
                <span className="inline-flex px-1 py-0.5 rounded text-red-300 bg-red-900">
                  Disabled
                </span>
              )}
            </div>
          ))}
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div>
            CPU: {(host.load_cpu * 100).toFixed(0)}% /{" "}
            {(host.calculated_load.cpu_load * 100).toFixed(0)}%
          </div>
          <div>
            RAM: {(host.load_memory * 100).toFixed(0)}% /{" "}
            {(host.calculated_load.memory_load * 100).toFixed(0)}%
          </div>
          <div>
            Disk: {(host.load_disk * 100).toFixed(0)}% /{" "}
            {(host.calculated_load.disk_load * 100).toFixed(0)}%
          </div>
          <div className="font-medium text-white">
            Overall: {(host.calculated_load.overall_load * 100).toFixed(0)}%
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap text-center">
        <span
          className={`inline-flex px-0.5 py-0.5 font-medium rounded ${
            host.calculated_load.active_vms > 0
              ? "bg-blue-900 text-blue-300"
              : "bg-gray-600 text-gray-400"
          }`}
        >
          {host.calculated_load.active_vms}
        </span>
      </td>
      <td className="whitespace-nowrap">
        <StatusBadge status={host.enabled ? "enabled" : "disabled"} />
      </td>
      <td className="text-right">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleEdit(host)}
          className="p-1"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
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
        (sum, host) =>
          sum + host.disks.reduce((diskSum, disk) => diskSum + disk.size, 0),
        0,
      ),
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hosts</h1>
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
              CPU:{" "}
              <span className="text-blue-400 font-medium">
                {stats.totalCPU} cores
              </span>
            </span>
            <span>
              Memory:{" "}
              <span className="text-purple-400 font-medium">
                {formatBytes(stats.totalMemory)}
              </span>
            </span>
            <span>
              Disks:{" "}
              <span className="text-orange-400 font-medium">
                {stats.totalDisks} ({formatBytes(stats.totalDiskSpace)})
              </span>
            </span>
          </div>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Create Host
        </Button>
      </div>
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
        minWidth="1400px"
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
    cpu: 0,
    memory: 0,
    enabled: true,
    load_cpu: 1.0,
    load_memory: 1.0,
    load_disk: 1.0,
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
        cpu: 0,
        memory: 0,
        enabled: true,
        load_cpu: 1.0,
        load_memory: 1.0,
        load_disk: 1.0,
      });
    } catch (error) {
      console.error("Failed to create host:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Host" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Host Name*
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="Host name"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              IP Address*
            </label>
            <input
              type="text"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="192.168.1.100"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Region*
            </label>
            <select
              value={formData.region_id}
              onChange={(e) =>
                setFormData({ ...formData, region_id: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
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
            <label className="block text-xs font-medium text-white mb-2">
              Host Type*
            </label>
            <select
              value={formData.kind}
              onChange={(e) =>
                setFormData({ ...formData, kind: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              required
            >
              <option value="proxmox">Proxmox</option>
              <option value="libvirt">Libvirt</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            API Token*
          </label>
          <input
            type="password"
            value={formData.api_token}
            onChange={(e) =>
              setFormData({ ...formData, api_token: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="API token for host communication"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              CPU Cores*
            </label>
            <input
              type="number"
              min="1"
              value={formData.cpu}
              onChange={(e) =>
                setFormData({ ...formData, cpu: parseInt(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Memory (GB)*
            </label>
            <input
              type="number"
              min="1"
              value={
                formData.memory
                  ? Math.round(formData.memory / (1024 * 1024 * 1024))
                  : 0
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  memory: (parseInt(e.target.value) || 0) * 1024 * 1024 * 1024,
                })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              VLAN ID
            </label>
            <input
              type="number"
              value={formData.vlan_id}
              onChange={(e) =>
                setFormData({ ...formData, vlan_id: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-white mb-2">Load Factors</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                CPU Load (%)
              </label>
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
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Memory Load (%)
              </label>
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
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Disk Load (%)
              </label>
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
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled-create"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData({ ...formData, enabled: e.target.checked })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-slate-800 border-slate-600"
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
    enabled: host.enabled,
    load_cpu: host.load_cpu,
    load_memory: host.load_memory,
    load_disk: host.load_disk,
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
        enabled: formData.enabled,
        load_cpu: formData.load_cpu,
        load_memory: formData.load_memory,
        load_disk: formData.load_disk,
      };

      // Only include API token if it was entered
      if (formData.api_token) {
        updates.api_token = formData.api_token;
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
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Host" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Host Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="Host name"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              IP Address
            </label>
            <input
              type="text"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="192.168.1.100"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Region
            </label>
            <select
              value={formData.region_id}
              onChange={(e) =>
                setFormData({ ...formData, region_id: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
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
            <label className="block text-xs font-medium text-white mb-2">
              Host Type
            </label>
            <select
              value={formData.kind}
              onChange={(e) =>
                setFormData({ ...formData, kind: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              required
            >
              <option value="proxmox">Proxmox</option>
              <option value="libvirt">Libvirt</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              API Token
            </label>
            <input
              type="password"
              value={formData.api_token}
              onChange={(e) =>
                setFormData({ ...formData, api_token: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="Leave empty to keep current token"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave empty to keep current token
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              VLAN ID
            </label>
            <input
              type="number"
              value={formData.vlan_id}
              onChange={(e) =>
                setFormData({ ...formData, vlan_id: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-white mb-2">Load Factors</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                CPU Load (%)
              </label>
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
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Memory Load (%)
              </label>
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
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Disk Load (%)
              </label>
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
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled-edit"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData({ ...formData, enabled: e.target.checked })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-slate-800 border-slate-600"
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
