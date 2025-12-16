import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { Button } from "./Button";
import { Modal } from "./Modal";
import {
  type AdminHostInfo,
  type AdminHostDisk,
  DiskType,
  DiskInterface,
} from "../lib/api";
import { formatBytes } from "../utils/formatBytes";
import { PencilIcon, PlusIcon } from "@heroicons/react/24/outline";

interface HostDiskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  host: AdminHostInfo;
  onSuccess: () => void;
}

export function HostDiskEditor({
  isOpen,
  onClose,
  host,
  onSuccess,
}: HostDiskEditorProps) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [editingDisk, setEditingDisk] = useState<AdminHostDisk | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    size: 0,
    kind: DiskType.SSD,
    interface: DiskInterface.PCIE,
    enabled: true,
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    size: 0,
    kind: "",
    interface: "",
    enabled: true,
  });

  const handleEditDisk = (disk: AdminHostDisk) => {
    setEditingDisk(disk);
    setEditFormData({
      name: disk.name,
      size: disk.size,
      kind: disk.kind,
      interface: disk.interface,
      enabled: disk.enabled,
    });
  };

  const handleCancelEdit = () => {
    setEditingDisk(null);
    setEditFormData({
      name: "",
      size: 0,
      kind: "",
      interface: "",
      enabled: true,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingDisk) return;

    setLoading(true);
    try {
      await adminApi.updateHostDisk(host.id, editingDisk.id, {
        name: editFormData.name,
        size: editFormData.size,
        kind: editFormData.kind,
        interface: editFormData.interface,
        enabled: editFormData.enabled,
      });
      onSuccess();
      handleCancelEdit();
      onClose();
    } catch (error) {
      console.error("Failed to update host disk:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDisk = async () => {
    setLoading(true);
    try {
      await adminApi.createHostDisk(host.id, {
        name: createFormData.name,
        size: createFormData.size,
        kind: createFormData.kind,
        interface: createFormData.interface,
        enabled: createFormData.enabled,
      });
      onSuccess();
      setShowCreateForm(false);
      onClose();
      setCreateFormData({
        name: "",
        size: 0,
        kind: DiskType.SSD,
        interface: DiskInterface.PCIE,
        enabled: true,
      });
    } catch (error) {
      console.error("Failed to create host disk:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderDiskRow = (disk: AdminHostDisk) => {
    const isEditing = editingDisk?.id === disk.id;

    if (isEditing) {
      return (
        <div
          key={disk.id}
          className="bg-slate-700 p-4 rounded border border-slate-500"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Disk Name*
              </label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Size (GB)*
              </label>
              <input
                type="number"
                min="1"
                value={Math.round(editFormData.size / (1024 * 1024 * 1024))}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    size: (parseInt(e.target.value) || 0) * 1024 * 1024 * 1024,
                  })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Disk Type*
              </label>
              <select
                value={editFormData.kind}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, kind: e.target.value })
                }
                required
              >
                <option value={DiskType.HDD}>HDD</option>
                <option value={DiskType.SSD}>SSD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Interface*
              </label>
              <select
                value={editFormData.interface}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    interface: e.target.value,
                  })
                }
                required
              >
                <option value={DiskInterface.SATA}>SATA</option>
                <option value={DiskInterface.SCSI}>SCSI</option>
                <option value={DiskInterface.PCIE}>PCIe</option>
              </select>
            </div>
          </div>

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id={`edit-disk-enabled-${disk.id}`}
              checked={editFormData.enabled}
              onChange={(e) =>
                setEditFormData({ ...editFormData, enabled: e.target.checked })
              }
            />
            <label
              htmlFor={`edit-disk-enabled-${disk.id}`}
              className="ml-2 text-xs text-white"
            >
              Disk Enabled
            </label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={disk.id}
        className="bg-slate-800 p-3 rounded border border-slate-600 flex items-center justify-between"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Name:</span>
              <span className="font-mono text-purple-400 truncate max-w-32">
                {disk.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Size:</span>
              <span className="text-white">{formatBytes(disk.size)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Type:</span>
              <span className="text-white">
                {disk.interface.toUpperCase()} {disk.kind.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {disk.enabled ? (
                <span className="inline-flex px-2 py-0.5 rounded text-green-300 bg-green-900 text-xs">
                  Enabled
                </span>
              ) : (
                <span className="inline-flex px-2 py-0.5 rounded text-red-300 bg-red-900 text-xs">
                  Disabled
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEditDisk(disk)}
            className="p-2"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderCreateForm = () => (
    <div className="bg-slate-700 p-4 rounded border border-slate-500">
      <h4 className="text-sm font-medium text-white mb-4">Create New Disk</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Disk Name*
          </label>
          <input
            type="text"
            value={createFormData.name}
            onChange={(e) =>
              setCreateFormData({ ...createFormData, name: e.target.value })
            }
            placeholder="e.g., main-storage"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Size (GB)*
          </label>
          <input
            type="number"
            min="1"
            value={
              createFormData.size > 0
                ? Math.round(createFormData.size / (1024 * 1024 * 1024))
                : ""
            }
            onChange={(e) =>
              setCreateFormData({
                ...createFormData,
                size: (parseInt(e.target.value) || 0) * 1024 * 1024 * 1024,
              })
            }
            placeholder="e.g., 500"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Disk Type*
          </label>
          <select
            value={createFormData.kind}
            onChange={(e) =>
              setCreateFormData({
                ...createFormData,
                kind: e.target.value as DiskType,
              })
            }
            required
          >
            <option value={DiskType.HDD}>HDD</option>
            <option value={DiskType.SSD}>SSD</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Interface*
          </label>
          <select
            value={createFormData.interface}
            onChange={(e) =>
              setCreateFormData({
                ...createFormData,
                interface: e.target.value as DiskInterface,
              })
            }
            required
          >
            <option value={DiskInterface.SATA}>SATA</option>
            <option value={DiskInterface.SCSI}>SCSI</option>
            <option value={DiskInterface.PCIE}>PCIe</option>
          </select>
        </div>
      </div>

      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="create-disk-enabled"
          checked={createFormData.enabled}
          onChange={(e) =>
            setCreateFormData({ ...createFormData, enabled: e.target.checked })
          }
        />
        <label
          htmlFor="create-disk-enabled"
          className="ml-2 text-xs text-white"
        >
          Disk Enabled
        </label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowCreateForm(false)}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={handleCreateDisk} disabled={loading}>
          {loading ? "Creating..." : "Create Disk"}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Host Disks"
      size="2xl"
    >
      <div className="space-y-4">
        <div className="bg-slate-800 p-4 rounded border border-slate-600">
          <h4 className="text-sm font-medium text-white mb-2">
            Host Information
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Host:</span>
              <span className="ml-2 text-white">{host.name}</span>
            </div>
            <div>
              <span className="text-gray-400">Region:</span>
              <span className="ml-2 text-white">{host.region.name}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium text-white">
            Existing Disks ({host.disks.length})
          </h4>
          {!showCreateForm && (
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add New Disk
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {host.disks.map(renderDiskRow)}
          {showCreateForm && renderCreateForm()}
        </div>

        {host.disks.length === 0 && !showCreateForm && (
          <div className="text-center py-8 text-gray-400">
            No disks configured for this host
          </div>
        )}
      </div>
    </Modal>
  );
}
