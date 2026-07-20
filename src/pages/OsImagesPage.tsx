import {
  ArrowDownTrayIcon,
  CommandLineIcon,
  PencilIcon,
  PlusIcon,
  ServerIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { CloudImagePickerModal } from "../components/CloudImagePickerModal";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { type AdminVmOsImageInfo, ApiOsDistribution } from "../lib/api";
import type { StandardCloudImage } from "../lib/cloudImageCatalog";
import { confirmDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";

export function OsImagesPage() {
  const adminApi = useAdminApi();
  const [modalImage, setModalImage] = useState<AdminVmOsImageInfo | null | undefined>(undefined);
  const [showPicker, setShowPicker] = useState(false);
  const [prefill, setPrefill] = useState<StandardCloudImage | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // undefined = closed, null = create, AdminVmOsImageInfo = edit
  const openCreate = (imagePrefill?: StandardCloudImage) => {
    setPrefill(imagePrefill);
    setModalImage(null);
  };
  const openEdit = (image: AdminVmOsImageInfo) => {
    setPrefill(undefined);
    setModalImage(image);
  };
  const closeModal = () => setModalImage(undefined);

  const handleDownload = async (image: AdminVmOsImageInfo) => {
    try {
      await adminApi.downloadVmOsImage(image.id);
      toastService.success("Image download triggered");
    } catch (error) {
      console.error("Failed to trigger download for OS image:", error);
      toastService.error(error instanceof Error ? error.message : "Failed to trigger download");
    }
  };

  const handleDelete = async (image: AdminVmOsImageInfo) => {
    if (
      await confirmDialog({
        title: "Delete OS Image",
        message: `Are you sure you want to delete OS image "${image.distribution} ${image.version}"?`,
      })
    ) {
      try {
        await adminApi.deleteVmOsImage(image.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete OS image:", error);
        toastService.error(error instanceof Error ? error.message : "Failed to delete OS image");
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Image</th>
      <th>Status</th>
      <th>Active VMs</th>
      <th>Details</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (image: AdminVmOsImageInfo, index: number) => (
    <tr key={image.id || index}>
      <td className="whitespace-nowrap align-top text-white">{image.id}</td>
      <td className="align-top">
        <div className="min-w-0 max-w-[18rem]">
          <div className="truncate font-medium text-white capitalize" title={`${image.distribution} ${image.version}`}>
            <span className="capitalize">{image.distribution}</span> {image.version}
          </div>
          <div className="mt-0.5 truncate text-xs capitalize text-slate-400" title={image.flavour}>
            {image.flavour}
          </div>
        </div>
      </td>
      <td className="align-top">
        <StatusBadge status={image.enabled ? "enabled" : "disabled"} />
      </td>
      <td className="align-top text-gray-300">
        <div className="flex items-center">
          <ServerIcon className="h-4 w-4 mr-1 text-gray-400" />
          <span className="font-medium">{image.active_vm_count}</span>
        </div>
      </td>
      <td className="align-top text-gray-300">
        <div className="text-xs space-y-0.5">
          <div>Released {formatDate(image.release_date)}</div>
          <div className="truncate text-slate-400" title={image.default_username || ""}>
            User: {image.default_username || "-"}
          </div>
        </div>
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDownload(image)}
            className="p-1"
            title="Trigger download"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openEdit(image)} className="p-1">
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
      <StatsHeader
        title="OS Images"
        stats={[
          { label: "Total", value: stats.total },
          { label: "Enabled", value: stats.enabled, tone: "success" },
          { label: "Disabled", value: stats.disabled, tone: "danger" },
          { label: "Distributions", value: stats.distributions, tone: "accent" },
          { label: "Active VMs", value: stats.totalActiveVMs, tone: "purple" },
        ]}
        actions={
          <Button onClick={() => setShowPicker(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add OS Image
          </Button>
        }
      />
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
        minWidth="800px"
      />

      <CloudImagePickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(image) => {
          setShowPicker(false);
          openCreate(image);
        }}
        onCustom={() => {
          setShowPicker(false);
          openCreate();
        }}
      />

      <OsImageModal
        isOpen={modalImage !== undefined}
        image={modalImage ?? undefined}
        prefill={prefill}
        onClose={closeModal}
        onSuccess={() => {
          refreshData();
          closeModal();
        }}
      />
    </div>
  );
}

const INPUT_CLASS =
  "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500";

const EMPTY_FORM = {
  distribution: ApiOsDistribution.UBUNTU,
  flavour: "",
  version: "",
  enabled: true,
  release_date: new Date().toISOString().split("T")[0],
  url: "",
  default_username: "",
  sha2: "",
  sha2_url: "",
};

function OsImageModal({
  isOpen,
  image,
  prefill,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  image?: AdminVmOsImageInfo;
  prefill?: StandardCloudImage;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const isEdit = image !== undefined;

  // Sync form data whenever the modal opens or the target image changes
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setFormData(
      isEdit
        ? {
            distribution: image.distribution,
            flavour: image.flavour,
            version: image.version,
            enabled: image.enabled,
            release_date: new Date(image.release_date).toISOString().split("T")[0],
            url: image.url,
            default_username: image.default_username || "",
            sha2: image.sha2 || "",
            sha2_url: image.sha2_url || "",
          }
        : {
            ...EMPTY_FORM,
            ...(prefill && {
              distribution: prefill.distribution,
              flavour: prefill.flavour,
              version: prefill.version,
              url: prefill.url,
              default_username: prefill.default_username,
              sha2_url: prefill.sha2_url || "",
              release_date: prefill.release_date || EMPTY_FORM.release_date,
            }),
          },
    );
  }, [isOpen, image, isEdit, prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      distribution: formData.distribution,
      flavour: formData.flavour,
      version: formData.version,
      enabled: formData.enabled,
      release_date: new Date(formData.release_date).toISOString(),
      url: formData.url,
      default_username: formData.default_username || undefined,
      sha2: formData.sha2 || undefined,
      sha2_url: formData.sha2_url || undefined,
    };

    try {
      if (isEdit) {
        await adminApi.updateVmOsImage(image.id, payload);
      } else {
        await adminApi.createVmOsImage(payload);
      }
      onSuccess();
    } catch (err) {
      console.error(`Failed to ${isEdit ? "update" : "create"} OS image:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} OS image`);
    } finally {
      setLoading(false);
    }
  };

  const set = (field: Partial<typeof formData>) => setFormData((prev) => ({ ...prev, ...field }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit OS Image" : "Create New OS Image"} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="os-distribution" className="block text-xs font-medium text-white mb-2">
              Distribution *
            </label>
            <select
              id="os-distribution"
              value={formData.distribution}
              onChange={(e) => set({ distribution: e.target.value as ApiOsDistribution })}
              className={INPUT_CLASS}
              required
            >
              <option value={ApiOsDistribution.UBUNTU}>Ubuntu</option>
              <option value={ApiOsDistribution.DEBIAN}>Debian</option>
              <option value={ApiOsDistribution.CENTOS}>CentOS</option>
              <option value={ApiOsDistribution.FEDORA}>Fedora</option>
              <option value={ApiOsDistribution.FREEBSD}>FreeBSD</option>
              <option value={ApiOsDistribution.OPENSUSE}>openSUSE</option>
              <option value={ApiOsDistribution.ARCHLINUX}>Arch Linux</option>
              <option value={ApiOsDistribution.REDHAT_ENTERPRISE}>Red Hat Enterprise</option>
              <option value={ApiOsDistribution.ALMALINUX}>AlmaLinux</option>
              <option value={ApiOsDistribution.ROCKYLINUX}>Rocky Linux</option>
              <option value={ApiOsDistribution.ALPINE}>Alpine</option>
              <option value={ApiOsDistribution.NIXOS}>NixOS</option>
              <option value={ApiOsDistribution.OPENBSD}>OpenBSD</option>
              <option value={ApiOsDistribution.NETBSD}>NetBSD</option>
              <option value={ApiOsDistribution.GENTOO}>Gentoo</option>
              <option value={ApiOsDistribution.VOIDLINUX}>Void Linux</option>
            </select>
          </div>
          <div>
            <label htmlFor="os-flavour" className="block text-xs font-medium text-white mb-2">
              Flavour *
            </label>
            <input
              id="os-flavour"
              type="text"
              value={formData.flavour}
              onChange={(e) => set({ flavour: e.target.value })}
              className={INPUT_CLASS}
              placeholder="e.g., server, desktop"
              required
            />
          </div>
          <div>
            <label htmlFor="os-version" className="block text-xs font-medium text-white mb-2">
              Version *
            </label>
            <input
              id="os-version"
              type="text"
              value={formData.version}
              onChange={(e) => set({ version: e.target.value })}
              className={INPUT_CLASS}
              placeholder="e.g., 22.04, 11, 8"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="os-release-date" className="block text-xs font-medium text-white mb-2">
              Release Date *
            </label>
            <input
              id="os-release-date"
              type="date"
              value={formData.release_date}
              onChange={(e) => set({ release_date: e.target.value })}
              className={INPUT_CLASS}
              required
            />
          </div>
          <div>
            <label htmlFor="os-default-username" className="block text-xs font-medium text-white mb-2">
              Default Username
            </label>
            <input
              id="os-default-username"
              type="text"
              value={formData.default_username}
              onChange={(e) => set({ default_username: e.target.value })}
              className={INPUT_CLASS}
              placeholder="e.g., ubuntu, root, admin"
            />
          </div>
        </div>

        <div>
          <label htmlFor="os-url" className="block text-xs font-medium text-white mb-2">
            Image URL *
          </label>
          <input
            id="os-url"
            type="url"
            value={formData.url}
            onChange={(e) => set({ url: e.target.value })}
            className={INPUT_CLASS}
            placeholder="https://example.com/path/to/image.img"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="os-sha2" className="block text-xs font-medium text-white mb-2">
              SHA-2 Checksum (optional)
            </label>
            <input
              id="os-sha2"
              type="text"
              value={formData.sha2}
              onChange={(e) => set({ sha2: e.target.value })}
              className={`${INPUT_CLASS} font-mono`}
              placeholder="SHA-256/384/512 checksum hash"
            />
          </div>
          <div>
            <label htmlFor="os-sha2-url" className="block text-xs font-medium text-white mb-2">
              SHA-2 Checksum URL (optional)
            </label>
            <input
              id="os-sha2-url"
              type="url"
              value={formData.sha2_url}
              onChange={(e) => set({ sha2_url: e.target.value })}
              className={INPUT_CLASS}
              placeholder="https://example.com/SHA512SUMS"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="os-enabled"
            checked={formData.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
            className="h-4 w-4 text-blue-600 bg-slate-800 border-slate-600 rounded"
          />
          <label htmlFor="os-enabled" className="ml-2 text-xs text-white">
            Enable image
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (isEdit ? "Updating..." : "Creating...") : isEdit ? "Update OS Image" : "Create OS Image"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
