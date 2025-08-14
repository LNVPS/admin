import { useState, useMemo, useCallback } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { PaginatedTable } from "../components/PaginatedTable";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { AdminRoleInfo, PaginatedApiResponse } from "../lib/api";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export function RolesPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminRoleInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filter states
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Load all roles once and cache them
  const {
    data: rolesResponse,
    loading: rolesLoading,
    error: rolesError,
  } = useApiCall(
    () => adminApi.getRoles({ limit: 1000, offset: 0 }),
    [refreshTrigger],
  );

  const allRoles = rolesResponse?.data || [];

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Extract unique resources and actions from available permissions
  const getUniqueResources = () => {
    const resources = new Set<string>();
    AVAILABLE_PERMISSIONS.forEach((permission) => {
      const [resource] = permission.split("::");
      if (resource) resources.add(resource);
    });
    return Array.from(resources).sort();
  };

  const getUniqueActions = () => {
    const actions = new Set<string>();
    AVAILABLE_PERMISSIONS.forEach((permission) => {
      const [, action] = permission.split("::");
      if (action) actions.add(action);
    });
    return Array.from(actions).sort();
  };

  // Memoized filtered roles to avoid recalculating on every render
  const filteredRoles = useMemo(() => {
    if (!resourceFilter && !actionFilter) {
      return allRoles;
    }

    return allRoles.filter((role) => {
      if (!role.permissions || role.permissions.length === 0) {
        return false;
      }

      return role.permissions.some((permission) => {
        const [resource, action] = permission.split("::");
        const matchesResource = !resourceFilter || resource === resourceFilter;
        const matchesAction = !actionFilter || action === actionFilter;
        return matchesResource && matchesAction;
      });
    });
  }, [allRoles, resourceFilter, actionFilter]);

  // Create a wrapper API function that returns filtered results
  const filteredApiCall = useCallback(
    async (params: {
      limit: number;
      offset: number;
    }): Promise<PaginatedApiResponse<AdminRoleInfo>> => {
      // Apply pagination to filtered results
      const startIndex = params.offset;
      const endIndex = startIndex + params.limit;
      const paginatedData = filteredRoles.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        total: filteredRoles.length,
        count: paginatedData.length,
        limit: params.limit,
        offset: params.offset,
      };
    },
    [filteredRoles],
  );

  const clearFilters = () => {
    setResourceFilter("");
    setActionFilter("");
  };

  const hasActiveFilters = resourceFilter || actionFilter;

  const handleEdit = (role: AdminRoleInfo) => {
    setSelectedRole(role);
    setShowEditModal(true);
  };

  const handleDelete = async (role: AdminRoleInfo) => {
    if (role.is_system_role) {
      alert("Cannot delete system roles.");
      return;
    }

    if (confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      try {
        await adminApi.deleteRole(role.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete role:", error);
      }
    }
  };

  const renderHeader = () => (
    <>
      <th>ID</th>
      <th>Name</th>
      <th>Description</th>
      <th>Permissions</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (role: AdminRoleInfo, index: number) => (
    <tr key={role.id || index}>
      <td className="whitespace-nowrap text-white">{role.id}</td>
      <td className="whitespace-nowrap text-gray-300">{role.name}</td>
      <td className="text-gray-400">{role.description || "No description"}</td>
      <td className="text-gray-300">
        <div className="flex flex-wrap gap-1">
          {role.permissions && role.permissions.length > 0 ? (
            <>
              {role.permissions
                .slice(0, 2)
                .map((permission: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex px-2 py-1 font-semibold rounded-full bg-blue-900 text-blue-300"
                  >
                    {permission}
                  </span>
                ))}
              {role.permissions.length > 2 && (
                <span className="inline-flex px-2 py-1 font-semibold rounded-full bg-gray-600 text-gray-300">
                  +{role.permissions.length - 2} more
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-500">No permissions</span>
          )}
        </div>
      </td>
      <td className="text-right">
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEdit(role)}
            className="p-1"
            disabled={role.is_system_role}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(role)}
            className="text-red-400 hover:text-red-300 p-1"
            disabled={role.is_system_role}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const calculateStats = (roles: AdminRoleInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      systemRoles: roles.filter((role) => role.is_system_role).length,
      customRoles: roles.filter((role) => !role.is_system_role).length,
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Roles</h1>
            <div className="mt-2 flex gap-4 text-sm text-gray-400">
              <span>
                Total:{" "}
                <span className="text-white font-medium">{stats.total}</span>
              </span>
              <span>
                System:{" "}
                <span className="text-blue-400 font-medium">
                  {stats.systemRoles}
                </span>
              </span>
              <span>
                Custom:{" "}
                <span className="text-green-400 font-medium">
                  {stats.customRoles}
                </span>
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className={
                hasActiveFilters ? "text-blue-400 border-blue-400" : ""
              }
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 rounded-full">
                  {(resourceFilter ? 1 : 0) + (actionFilter ? 1 : 0)}
                </span>
              )}
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">
                Filter Roles by Permissions
              </h3>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={clearFilters}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Resource
                </label>
                <select
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                >
                  <option value="">All resources</option>
                  {getUniqueResources().map((resource) => (
                    <option key={resource} value={resource}>
                      {resource}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Action
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                >
                  <option value="">All actions</option>
                  {getUniqueActions().map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-3 pt-3 border-t border-slate-600">
                <div className="flex flex-wrap gap-2">
                  {resourceFilter && (
                    <div className="inline-flex items-center px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded-full">
                      Resource: {resourceFilter}
                      <button
                        onClick={() => setResourceFilter("")}
                        className="ml-1 hover:text-white"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {actionFilter && (
                    <div className="inline-flex items-center px-2 py-1 bg-green-600 text-green-100 text-xs rounded-full">
                      Action: {actionFilter}
                      <button
                        onClick={() => setActionFilter("")}
                        className="ml-1 hover:text-white"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Handle initial loading and error states
  if (rolesLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-white">Loading roles...</div>
      </div>
    );
  }

  if (rolesError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load roles</p>
          <Button onClick={() => setRefreshTrigger((prev) => prev + 1)}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={filteredApiCall}
        renderHeader={renderHeader}
        renderRow={renderRow}
        calculateStats={calculateStats}
        itemsPerPage={25}
        errorAction="view roles"
        loadingMessage="Applying filters..."
        dependencies={[resourceFilter, actionFilter]}
        minWidth="1000px"
        renderEmptyState={() => (
          <div className="text-center py-8">
            <p className="text-gray-400">
              {hasActiveFilters
                ? "No roles match the selected filters"
                : "No roles found"}
            </p>
          </div>
        )}
      />

      {/* Create Role Modal */}
      <CreateRoleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refreshData}
      />

      {/* Edit Role Modal */}
      {selectedRole && (
        <EditRoleModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRole(null);
          }}
          role={selectedRole}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

// Available permissions - this could be dynamic from API
const AVAILABLE_PERMISSIONS = [
  "users::view",
  "users::update",
  "virtual_machines::view",
  "virtual_machines::update",
  "virtual_machines::delete",
  "hosts::view",
  "hosts::update",
  "payments::view",
  "analytics::view",
  "system::view",
  "roles::view",
  "roles::create",
  "roles::update",
  "roles::delete",
  "audit::view",
  "access_policy::view",
  "access_policy::create",
  "access_policy::update",
  "access_policy::delete",
  "company::view",
  "company::create",
  "company::update",
  "company::delete",
  "ip_range::view",
  "ip_range::create",
  "ip_range::update",
  "ip_range::delete",
  "router::view",
  "router::create",
  "router::update",
  "router::delete",
  "vm_custom_pricing::view",
  "vm_custom_pricing::create",
  "vm_custom_pricing::update",
  "vm_custom_pricing::delete",
  "vm_os_image::view",
  "vm_os_image::create",
  "vm_os_image::update",
  "vm_os_image::delete",
  "vm_template::view",
  "vm_template::create",
  "vm_template::update",
  "vm_template::delete",
];

// Create Role Modal Component
function CreateRoleModal({
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
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await adminApi.createRole({
        name: formData.name,
        description: formData.description || undefined,
        permissions: formData.permissions,
      });
      onSuccess();
      onClose();
      setFormData({ name: "", description: "", permissions: [] });
    } catch (error) {
      console.error("Failed to create role:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Role" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Role Name *
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
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className=""
            rows={3}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Permissions
          </label>
          <div className="max-h-60 overflow-y-auto border border-slate-600 rounded p-3 bg-slate-800">
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <div key={permission} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`create-${permission}`}
                    checked={formData.permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className=""
                  />
                  <label
                    htmlFor={`create-${permission}`}
                    className="ml-2 text-xs text-white font-mono"
                  >
                    {permission}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Role"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Role Modal Component
function EditRoleModal({
  isOpen,
  onClose,
  role,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  role: AdminRoleInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: role.name,
    description: role.description || "",
    permissions: role.permissions || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await adminApi.updateRole(role.id, {
        name: formData.name,
        description: formData.description || undefined,
        permissions: formData.permissions,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Role" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Role Name *
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
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className=""
            rows={3}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Permissions
          </label>
          <div className="max-h-60 overflow-y-auto border border-slate-600 rounded p-3 bg-slate-800">
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <div key={permission} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`edit-${permission}`}
                    checked={formData.permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className=""
                  />
                  <label
                    htmlFor={`edit-${permission}`}
                    className="ml-2 text-xs text-white font-mono"
                  >
                    {permission}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Role"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
