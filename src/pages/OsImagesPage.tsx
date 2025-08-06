import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { AdminVmOsImageInfo } from "../lib/api";
import {
  CommandLineIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";

export function OsImagesPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<AdminVmOsImageInfo | null>(
    null,
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (image: AdminVmOsImageInfo) => {
    setSelectedImage(image);
    setShowEditModal(true);
  };

  const handleDelete = async (image: AdminVmOsImageInfo) => {
    if (
      confirm(
        `Are you sure you want to delete OS image "${image.distribution} ${image.version}"?`,
      )
    ) {
      try {
        await adminApi.deleteVmOsImage(image.id);
        refreshData(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete OS image:", error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Distribution</th>
      <th>Version</th>
      <th>Flavour</th>
      <th>Status</th>
      <th>Active VMs</th>
      <th>Release Date</th>
      <th>Default User</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (image: AdminVmOsImageInfo, index: number) => (
    <tr key={image.id || index}>
      <td className="whitespace-nowrap text-white">{image.id}</td>
      <td>
        <div className="font-medium text-white capitalize">
          {image.distribution}
        </div>
      </td>
      <td className="text-gray-300">{image.version}</td>
      <td className="text-gray-300 capitalize">{image.flavour}</td>
      <td>
        <StatusBadge status={image.enabled ? "enabled" : "disabled"} />
      </td>
      <td className="text-gray-300">
        <div className="flex items-center">
          <ServerIcon className="h-4 w-4 mr-1 text-gray-400" />
          <span className="font-medium">{image.active_vm_count}</span>
        </div>
      </td>
      <td className="text-gray-300">{formatDate(image.release_date)}</td>
      <td className="text-gray-300">{image.default_username || "-"}</td>
      <td className="text-right">
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEdit(image)}
            className="p-1"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(image)}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <CommandLineIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No OS images found</p>
    </div>
  );

  const calculateStats = (images: AdminVmOsImageInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      enabled: images.filter((image) => image.enabled).length,
      disabled: images.filter((image) => !image.enabled).length,
      distributions: new Set(images.map((img) => img.distribution)).size,
      totalActiveVMs: images.reduce((sum, img) => sum + img.active_vm_count, 0),
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">OS Images</h1>
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
              Distributions:{" "}
              <span className="text-blue-400 font-medium">
                {stats.distributions}
              </span>
            </span>
            <span>
              Active VMs:{" "}
              <span className="text-purple-400 font-medium">
                {stats.totalActiveVMs}
              </span>
            </span>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add OS Image
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getVmOsImages(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view OS images"
        loadingMessage="Loading OS images..."
        dependencies={[refreshTrigger]}
        minWidth="1000px"
      />

      {/* Create OS Image Modal */}
      <CreateOsImageModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refreshData}
      />

      {/* Edit OS Image Modal */}
      {selectedImage && (
        <EditOsImageModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedImage(null);
          }}
          image={selectedImage}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

// Create OS Image Modal Component
function CreateOsImageModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    distribution: "",
    flavour: "",
    version: "",
    enabled: true,
    release_date: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
    url: "",
    default_username: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await adminApi.createVmOsImage({
        distribution: formData.distribution,
        flavour: formData.flavour,
        version: formData.version,
        enabled: formData.enabled,
        release_date: new Date(formData.release_date).toISOString(),
        url: formData.url,
        default_username: formData.default_username || undefined,
      });
      onSuccess();
      onClose();
      setFormData({
        distribution: "",
        flavour: "",
        version: "",
        enabled: true,
        release_date: new Date().toISOString().split("T")[0],
        url: "",
        default_username: "",
      });
    } catch (error) {
      console.error("Failed to create OS image:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New OS Image">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Distribution *
            </label>
            <input
              type="text"
              value={formData.distribution}
              onChange={(e) =>
                setFormData({ ...formData, distribution: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="e.g., ubuntu, debian, centos"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Flavour *
            </label>
            <input
              type="text"
              value={formData.flavour}
              onChange={(e) =>
                setFormData({ ...formData, flavour: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="e.g., server, desktop"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Version *
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) =>
                setFormData({ ...formData, version: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="e.g., 22.04, 11, 8"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Release Date *
            </label>
            <input
              type="date"
              value={formData.release_date}
              onChange={(e) =>
                setFormData({ ...formData, release_date: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Image URL *
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="https://example.com/path/to/image.img"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Default Username
          </label>
          <input
            type="text"
            value={formData.default_username}
            onChange={(e) =>
              setFormData({ ...formData, default_username: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="e.g., ubuntu, root, admin"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData({ ...formData, enabled: e.target.checked })
            }
            className="h-4 w-4 text-primary-600 bg-slate-800 border-slate-600 rounded"
          />
          <label htmlFor="enabled" className="ml-2 text-xs text-white">
            Enable image
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create OS Image"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit OS Image Modal Component
function EditOsImageModal({
  isOpen,
  onClose,
  image,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  image: AdminVmOsImageInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    distribution: image.distribution,
    flavour: image.flavour,
    version: image.version,
    enabled: image.enabled,
    release_date: new Date(image.release_date).toISOString().split("T")[0],
    url: image.url,
    default_username: image.default_username || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await adminApi.updateVmOsImage(image.id, {
        distribution: formData.distribution,
        flavour: formData.flavour,
        version: formData.version,
        enabled: formData.enabled,
        release_date: new Date(formData.release_date).toISOString(),
        url: formData.url,
        default_username: formData.default_username || undefined,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update OS image:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit OS Image">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Distribution *
            </label>
            <input
              type="text"
              value={formData.distribution}
              onChange={(e) =>
                setFormData({ ...formData, distribution: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Flavour *
            </label>
            <input
              type="text"
              value={formData.flavour}
              onChange={(e) =>
                setFormData({ ...formData, flavour: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Version *
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) =>
                setFormData({ ...formData, version: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Release Date *
            </label>
            <input
              type="date"
              value={formData.release_date}
              onChange={(e) =>
                setFormData({ ...formData, release_date: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Image URL *
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Default Username
          </label>
          <input
            type="text"
            value={formData.default_username}
            onChange={(e) =>
              setFormData({ ...formData, default_username: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="e.g., ubuntu, root, admin"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled-edit"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData({ ...formData, enabled: e.target.checked })
            }
            className="h-4 w-4 text-primary-600 bg-slate-800 border-slate-600 rounded"
          />
          <label htmlFor="enabled-edit" className="ml-2 text-xs text-white">
            Enable image
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update OS Image"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
