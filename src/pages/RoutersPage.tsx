import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import { OvhCredentialsInput } from "../components/OvhCredentialsInput";
import { AdminRouterDetail, RouterKind } from "../lib/api";
import {
  ServerIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

export function RoutersPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRouter, setSelectedRouter] =
    useState<AdminRouterDetail | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (router: AdminRouterDetail) => {
    setSelectedRouter(router);
    setShowEditModal(true);
  };

  const handleDelete = async (router: AdminRouterDetail) => {
    if (router.access_policy_count > 0) {
      alert(
        `Cannot delete router "${router.name}" because it is used by ${router.access_policy_count} access polic${router.access_policy_count === 1 ? "y" : "ies"}. Please remove it from all access policies before deleting.`,
      );
      return;
    }

    if (confirm(`Are you sure you want to delete router "${router.name}"?`)) {
      try {
        await adminApi.deleteRouter(router.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete router:", error);
      }
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Router Name</th>
      <th>Type</th>
      <th>URL</th>
      <th>Access Policies</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (router: AdminRouterDetail, index: number) => (
    <tr key={router.id || index}>
      <td className="whitespace-nowrap text-white">{router.id}</td>
      <td>
        <div className="font-medium text-white">{router.name}</div>
      </td>
      <td className="text-gray-300">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-200 capitalize">
          {router.kind.replace("_", " ")}
        </span>
      </td>
      <td className="text-gray-300">
        <span className="font-mono text-sm break-all">{router.url}</span>
      </td>
      <td className="text-gray-300">
        <div className="flex items-center">
          <KeyIcon className="h-4 w-4 mr-1 text-gray-400" />
          <span className="font-medium">{router.access_policy_count}</span>
        </div>
      </td>
      <td>
        <StatusBadge status={router.enabled ? "active" : "inactive"} />
      </td>
      <td className="text-right">
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEdit(router)}
            className="p-1"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(router)}
            className="text-red-400 hover:text-red-300 p-1"
            disabled={router.access_policy_count > 0}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <ServerIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No routers found</p>
    </div>
  );

  const calculateStats = (routers: AdminRouterDetail[], totalItems: number) => {
    const stats = {
      total: totalItems,
      enabled: routers.filter((router) => router.enabled).length,
      disabled: routers.filter((router) => !router.enabled).length,
      totalPolicies: routers.reduce(
        (sum, router) => sum + router.access_policy_count,
        0,
      ),
      mikrotikRouters: routers.filter((router) => router.kind === "mikrotik")
        .length,
      ovhRouters: routers.filter(
        (router) => router.kind === "ovh_additional_ip",
      ).length,
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Routers</h1>
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
              <span className="text-yellow-400 font-medium">
                {stats.disabled}
              </span>
            </span>
            <span>
              Policies:{" "}
              <span className="text-blue-400 font-medium">
                {stats.totalPolicies}
              </span>
            </span>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Router
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getRouters(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view routers"
        loadingMessage="Loading routers..."
        dependencies={[refreshTrigger]}
        minWidth="1400px"
      />

      {/* Create Router Modal */}
      <CreateRouterModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refreshData}
      />

      {/* Edit Router Modal */}
      {selectedRouter && (
        <EditRouterModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRouter(null);
          }}
          router={selectedRouter}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

// Create Router Modal Component
function CreateRouterModal({
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
  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    enabled: true,
    kind: RouterKind.MIKROTIK,
    url: "",
    token: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        name: formData.name,
        enabled: formData.enabled,
        kind: formData.kind,
        url: formData.url,
        token: formData.token,
      };

      await adminApi.createRouter(data);
      onSuccess();
      onClose();
      setFormData({
        name: "",
        enabled: true,
        kind: RouterKind.MIKROTIK,
        url: "",
        token: "",
      });
      setShowToken(false);
    } catch (error) {
      console.error("Failed to create router:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Router">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Router Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className=""
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Router Type *
          </label>
          <select
            value={formData.kind}
            onChange={(e) =>
              setFormData({ ...formData, kind: e.target.value as RouterKind })
            }
            className=""
            required
          >
            <option value={RouterKind.MIKROTIK}>MikroTik</option>
            <option value={RouterKind.OVH_ADDITIONAL_IP}>
              OVH Additional IP
            </option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Router API URL *
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="font-mono"
            placeholder="https://router.example.com/api"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            {formData.kind === RouterKind.OVH_ADDITIONAL_IP
              ? "OVH Credentials *"
              : "Authentication Token *"}
          </label>
          {formData.kind === RouterKind.OVH_ADDITIONAL_IP ? (
            <OvhCredentialsInput
              value={formData.token}
              onChange={(token) => setFormData({ ...formData, token })}
              required
            />
          ) : (
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={formData.token}
                onChange={(e) =>
                  setFormData({ ...formData, token: e.target.value })
                }
                className="font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
              >
                {showToken ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData({ ...formData, enabled: e.target.checked })
            }
            className=""
          />
          <label
            htmlFor="enabled"
            className="ml-2 text-sm font-medium text-white"
          >
            Enable router
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Router"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Router Modal Component
function EditRouterModal({
  isOpen,
  onClose,
  router,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  router: AdminRouterDetail;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState({
    name: router.name,
    enabled: router.enabled,
    kind: router.kind,
    url: router.url,
    token: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: any = {
        name: formData.name,
        enabled: formData.enabled,
        kind: formData.kind,
        url: formData.url,
      };

      // Only include token if it's provided
      if (formData.token.trim()) {
        updates.token = formData.token;
      }

      await adminApi.updateRouter(router.id, updates);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update router:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Router">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Router Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className=""
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Router Type *
          </label>
          <select
            value={formData.kind}
            onChange={(e) =>
              setFormData({ ...formData, kind: e.target.value as RouterKind })
            }
            className=""
            required
          >
            <option value={RouterKind.MIKROTIK}>MikroTik</option>
            <option value={RouterKind.OVH_ADDITIONAL_IP}>
              OVH Additional IP
            </option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Router API URL *
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            {formData.kind === RouterKind.OVH_ADDITIONAL_IP
              ? "OVH Credentials"
              : "Authentication Token"}
          </label>
          {formData.kind === RouterKind.OVH_ADDITIONAL_IP ? (
            <>
              <OvhCredentialsInput
                value={formData.token}
                onChange={(token) => setFormData({ ...formData, token })}
              />
              <p className="mt-1 text-xs text-gray-400">
                Leave empty to keep the current OVH credentials
              </p>
            </>
          ) : (
            <>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={formData.token}
                  onChange={(e) =>
                    setFormData({ ...formData, token: e.target.value })
                  }
                  className="font-mono"
                  placeholder="Leave empty to keep current token"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                >
                  {showToken ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Leave empty to keep the current authentication token
              </p>
            </>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled-edit"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData({ ...formData, enabled: e.target.checked })
            }
            className=""
          />
          <label
            htmlFor="enabled-edit"
            className="ml-2 text-sm font-medium text-white"
          >
            Enable router
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Router"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
