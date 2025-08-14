import { useState, useEffect } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { AdminAccessPolicyDetail, AdminRouterDetail } from "../lib/api";
import {
  KeyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";

export function AccessPoliciesPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] =
    useState<AdminAccessPolicyDetail | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (policy: AdminAccessPolicyDetail) => {
    setSelectedPolicy(policy);
    setShowEditModal(true);
  };

  const handleDelete = async (policy: AdminAccessPolicyDetail) => {
    if (policy.ip_range_count > 0) {
      alert(
        `Cannot delete access policy "${policy.name}" because it is used by ${policy.ip_range_count} IP range(s). Please remove it from all IP ranges before deleting.`,
      );
      return;
    }

    if (
      confirm(`Are you sure you want to delete access policy "${policy.name}"?`)
    ) {
      try {
        await adminApi.deleteAccessPolicy(policy.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete access policy:", error);
      }
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Policy Name</th>
      <th>Kind</th>
      <th>Router</th>
      <th>Interface</th>
      <th>IP Ranges</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (policy: AdminAccessPolicyDetail, index: number) => (
    <tr key={policy.id || index}>
      <td className="whitespace-nowrap text-white">{policy.id}</td>
      <td>
        <div className="font-medium text-white">{policy.name}</div>
      </td>
      <td className="text-gray-300">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200 capitalize">
          {policy.kind.replace("_", " ")}
        </span>
      </td>
      <td className="text-gray-300">
        {policy.router_name ? (
          <div className="flex items-center">
            <ServerIcon className="h-4 w-4 mr-1 text-gray-400" />
            {policy.router_name}
          </div>
        ) : (
          <span className="text-gray-500">None</span>
        )}
      </td>
      <td className="text-gray-300">
        {policy.interface ? (
          <span className="font-mono text-sm">{policy.interface}</span>
        ) : (
          <span className="text-gray-500">None</span>
        )}
      </td>
      <td className="text-gray-300">
        <span className="font-medium">{policy.ip_range_count}</span>
      </td>
      <td className="text-right">
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEdit(policy)}
            className="p-1"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(policy)}
            className="text-red-400 hover:text-red-300 p-1"
            disabled={policy.ip_range_count > 0}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <KeyIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No access policies found</p>
    </div>
  );

  const calculateStats = (
    policies: AdminAccessPolicyDetail[],
    totalItems: number,
  ) => {
    const stats = {
      total: totalItems,
      withRouters: policies.filter((policy) => policy.router_id).length,
      withInterfaces: policies.filter((policy) => policy.interface).length,
      totalRanges: policies.reduce(
        (sum, policy) => sum + policy.ip_range_count,
        0,
      ),
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Access Policies</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total:{" "}
              <span className="text-white font-medium">{stats.total}</span>
            </span>
            <span>
              With Routers:{" "}
              <span className="text-blue-400 font-medium">
                {stats.withRouters}
              </span>
            </span>
            <span>
              With Interfaces:{" "}
              <span className="text-green-400 font-medium">
                {stats.withInterfaces}
              </span>
            </span>
            <span>
              IP Ranges:{" "}
              <span className="text-purple-400 font-medium">
                {stats.totalRanges}
              </span>
            </span>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Policy
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getAccessPolicies(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view access policies"
        loadingMessage="Loading access policies..."
        dependencies={[refreshTrigger]}
        minWidth="1200px"
      />

      {/* Create Access Policy Modal */}
      <CreateAccessPolicyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refreshData}
      />

      {/* Edit Access Policy Modal */}
      {selectedPolicy && (
        <EditAccessPolicyModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPolicy(null);
          }}
          policy={selectedPolicy}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

// Create Access Policy Modal Component
function CreateAccessPolicyModal({
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
  const [routers, setRouters] = useState<AdminRouterDetail[]>([]);
  const [loadingRouters, setLoadingRouters] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    kind: "static_arp",
    router_id: "",
    interface: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchRouters();
    }
  }, [isOpen]);

  const fetchRouters = async () => {
    setLoadingRouters(true);
    try {
      const result = await adminApi.getRouters();
      setRouters(result.data);
    } catch (error) {
      console.error("Failed to fetch routers:", error);
    } finally {
      setLoadingRouters(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        name: formData.name,
        kind: formData.kind,
        router_id: formData.router_id ? parseInt(formData.router_id) : null,
        interface: formData.interface || null,
      };

      await adminApi.createAccessPolicy(data);
      onSuccess();
      onClose();
      setFormData({
        name: "",
        kind: "static_arp",
        router_id: "",
        interface: "",
      });
    } catch (error) {
      console.error("Failed to create access policy:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Access Policy">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Policy Name *
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
            Kind
          </label>
          <select
            value={formData.kind}
            onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
            className=""
          >
            <option value="static_arp">Static ARP</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Router (Optional)
          </label>
          <select
            value={formData.router_id}
            onChange={(e) =>
              setFormData({ ...formData, router_id: e.target.value })
            }
            className=""
            disabled={loadingRouters}
          >
            <option value="">Select a router...</option>
            {routers.map((router) => (
              <option key={router.id} value={router.id.toString()}>
                {router.name} ({router.kind.replace("_", " ")})
                {!router.enabled && " - DISABLED"}
              </option>
            ))}
          </select>
          {loadingRouters && (
            <p className="text-xs text-gray-400 mt-1">Loading routers...</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Interface (Optional)
          </label>
          <input
            type="text"
            value={formData.interface}
            onChange={(e) =>
              setFormData({ ...formData, interface: e.target.value })
            }
            className=""
            placeholder="e.g., eth0, wlan0"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Policy"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Access Policy Modal Component
function EditAccessPolicyModal({
  isOpen,
  onClose,
  policy,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  policy: AdminAccessPolicyDetail;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [routers, setRouters] = useState<AdminRouterDetail[]>([]);
  const [loadingRouters, setLoadingRouters] = useState(false);
  const [formData, setFormData] = useState({
    name: policy.name,
    kind: policy.kind,
    router_id: policy.router_id ? policy.router_id.toString() : "",
    interface: policy.interface || "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchRouters();
    }
  }, [isOpen]);

  const fetchRouters = async () => {
    setLoadingRouters(true);
    try {
      const result = await adminApi.getRouters();
      setRouters(result.data);
    } catch (error) {
      console.error("Failed to fetch routers:", error);
    } finally {
      setLoadingRouters(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        name: formData.name,
        kind: formData.kind,
        router_id: formData.router_id ? parseInt(formData.router_id) : null,
        interface: formData.interface || null,
      };

      await adminApi.updateAccessPolicy(policy.id, updates);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update access policy:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Access Policy">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Policy Name *
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
            Kind
          </label>
          <select
            value={formData.kind}
            onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
            className=""
          >
            <option value="static_arp">Static ARP</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Router (Optional)
          </label>
          <select
            value={formData.router_id}
            onChange={(e) =>
              setFormData({ ...formData, router_id: e.target.value })
            }
            className=""
            disabled={loadingRouters}
          >
            <option value="">Select a router...</option>
            {routers.map((router) => (
              <option key={router.id} value={router.id.toString()}>
                {router.name} ({router.kind.replace("_", " ")})
                {!router.enabled && " - DISABLED"}
              </option>
            ))}
          </select>
          {loadingRouters && (
            <p className="text-xs text-gray-400 mt-1">Loading routers...</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Interface (Optional)
          </label>
          <input
            type="text"
            value={formData.interface}
            onChange={(e) =>
              setFormData({ ...formData, interface: e.target.value })
            }
            className=""
            placeholder="e.g., eth0, wlan0"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Policy"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
