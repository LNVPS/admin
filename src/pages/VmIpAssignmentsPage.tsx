import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { AdminVmIpAssignmentInfo, AdminIpRangeInfo } from "../lib/api";
import {
  GlobeAltIcon,
  PencilIcon,
  TrashIcon,
  ServerIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Modal } from "../components/Modal";

export function VmIpAssignmentsPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<AdminVmIpAssignmentInfo | null>(null);
  const [ipRanges, setIpRanges] = useState<AdminIpRangeInfo[]>([]);
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
  const [filters, setFilters] = useState({
    vm_id: "",
    ip_range_id: "",
    region_id: "",
    ip: "",
    include_deleted: false,
  });

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const loadIpRanges = async () => {
    try {
      const [ipRangesResult, regionsResult] = await Promise.all([
        adminApi.getIpRanges({ limit: 1000 }),
        adminApi.getRegions({ limit: 1000 }),
      ]);
      setIpRanges(ipRangesResult.data);
      setRegions(regionsResult.data.map((r) => ({ id: r.id, name: r.name })));
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  React.useEffect(() => {
    loadIpRanges();
  }, []);

  const getApiFilters = () => {
    const apiFilters: any = {};
    if (filters.vm_id) apiFilters.vm_id = parseInt(filters.vm_id);
    if (filters.ip_range_id)
      apiFilters.ip_range_id = parseInt(filters.ip_range_id);
    if (filters.region_id) apiFilters.region_id = parseInt(filters.region_id);
    if (filters.ip.trim()) apiFilters.ip = filters.ip.trim();
    if (filters.include_deleted) apiFilters.include_deleted = true;
    return apiFilters;
  };

  const clearFilters = () => {
    setFilters({
      vm_id: "",
      ip_range_id: "",
      region_id: "",
      ip: "",
      include_deleted: false,
    });
    setRefreshTrigger((prev) => prev + 1);
  };

  const hasActiveFilters = () => {
    return (
      filters.vm_id ||
      filters.ip_range_id ||
      filters.region_id ||
      filters.ip.trim() ||
      filters.include_deleted
    );
  };

  const handleEdit = (assignment: AdminVmIpAssignmentInfo) => {
    setSelectedAssignment(assignment);
    setShowEditModal(true);
  };

  const handleDelete = async (assignment: AdminVmIpAssignmentInfo) => {
    if (
      confirm(
        `Are you sure you want to delete IP assignment "${assignment.ip}"?`,
      )
    ) {
      try {
        await adminApi.deleteVmIpAssignment(assignment.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete IP assignment:", error);
      }
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>IP Address</th>
      <th>VM</th>
      <th>IP Range</th>
      <th>Region</th>
      <th>DNS</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (assignment: AdminVmIpAssignmentInfo, index: number) => (
    <tr key={assignment.id || index}>
      <td className="whitespace-nowrap text-white">{assignment.id}</td>
      <td>
        <div className="space-y-0.5">
          <Link
            to={`/ip-address/${encodeURIComponent(assignment.ip)}`}
            className="font-mono font-medium text-blue-400 hover:text-blue-300 hover:underline"
          >
            {assignment.ip}
          </Link>
          {assignment.arp_ref && (
            <div className="text-gray-400 text-sm">
              ARP: {assignment.arp_ref}
            </div>
          )}
        </div>
      </td>
      <td>
        <div className="space-y-0.5">
          <div className="flex items-center">
            <ServerIcon className="h-4 w-4 mr-1 text-gray-400" />
            <Link
              to={`/vms/${assignment.vm_id}`}
              className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
            >
              {assignment.vm_id}
            </Link>
          </div>
        </div>
      </td>
      <td>
        {assignment.ip_range_cidr ? (
          <button
            onClick={() => {
              setFilters({
                ...filters,
                ip_range_id: assignment.ip_range_id.toString(),
              });
              setRefreshTrigger((prev) => prev + 1);
              setShowFilters(true);
            }}
            className="text-blue-400 hover:text-blue-300 hover:underline font-mono text-left"
            title={`Filter by IP range ${assignment.ip_range_cidr}`}
          >
            {assignment.ip_range_cidr}
          </button>
        ) : (
          <span className="text-gray-300 font-mono">N/A</span>
        )}
      </td>
      <td className="text-gray-300">
        <div className="flex items-center">
          <GlobeAltIcon className="h-4 w-4 mr-1 text-gray-400" />
          {assignment.region_name || "N/A"}
        </div>
      </td>
      <td>
        <div className="space-y-0.5">
          {assignment.dns_forward && (
            <div className="text-sm text-blue-400">
              ↗ {assignment.dns_forward}
            </div>
          )}
          {assignment.dns_reverse && (
            <div className="text-sm text-green-400">
              ↙ {assignment.dns_reverse}
            </div>
          )}
          {!assignment.dns_forward && !assignment.dns_reverse && (
            <span className="text-gray-500">None</span>
          )}
        </div>
      </td>
      <td>
        <StatusBadge status={assignment.deleted ? "inactive" : "active"} />
      </td>
      <td className="text-right">
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEdit(assignment)}
            className="p-1"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(assignment)}
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
      <GlobeAltIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No IP assignments found</p>
    </div>
  );

  const calculateStats = (
    assignments: AdminVmIpAssignmentInfo[],
    totalItems: number,
  ) => {
    const stats = {
      total: totalItems,
      active: assignments.filter((assignment) => !assignment.deleted).length,
      withForwardDns: assignments.filter((assignment) => assignment.dns_forward)
        .length,
      withReverseDns: assignments.filter((assignment) => assignment.dns_reverse)
        .length,
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">VM IP Assignments</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total:{" "}
              <span className="text-white font-medium">{stats.total}</span>
            </span>
            <span>
              Active:{" "}
              <span className="text-green-400 font-medium">{stats.active}</span>
            </span>
            <span>
              Forward DNS:{" "}
              <span className="text-blue-400 font-medium">
                {stats.withForwardDns}
              </span>
            </span>
            <span>
              Reverse DNS:{" "}
              <span className="text-purple-400 font-medium">
                {stats.withReverseDns}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters() ? "text-blue-400" : ""}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters() && (
              <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {
                  Object.entries(filters).filter(([key, value]) =>
                    key === "include_deleted" ? value : value !== "",
                  ).length
                }
              </span>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Filters</h3>
            <div className="flex items-center space-x-2">
              {hasActiveFilters() && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-400 hover:text-red-300"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                VM ID
              </label>
              <input
                type="number"
                value={filters.vm_id}
                onChange={(e) => {
                  setFilters({ ...filters, vm_id: e.target.value });
                  setRefreshTrigger((prev) => prev + 1);
                }}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                placeholder="Enter VM ID"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                Region
              </label>
              <select
                value={filters.region_id}
                onChange={(e) => {
                  setFilters({ ...filters, region_id: e.target.value });
                  setRefreshTrigger((prev) => prev + 1);
                }}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
              >
                <option value="">All regions</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id.toString()}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                IP Range
              </label>
              <select
                value={filters.ip_range_id}
                onChange={(e) => {
                  setFilters({ ...filters, ip_range_id: e.target.value });
                  setRefreshTrigger((prev) => prev + 1);
                }}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
              >
                <option value="">All IP ranges</option>
                {ipRanges
                  .filter(
                    (range) =>
                      !filters.region_id ||
                      range.region_id.toString() === filters.region_id,
                  )
                  .map((range) => (
                    <option key={range.id} value={range.id.toString()}>
                      {range.cidr} ({range.region_name})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                IP Address
              </label>
              <input
                type="text"
                value={filters.ip}
                onChange={(e) => {
                  setFilters({ ...filters, ip: e.target.value });
                  setRefreshTrigger((prev) => prev + 1);
                }}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm font-mono"
                placeholder="192.168.1.100"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={filters.include_deleted}
                  onChange={(e) => {
                    setFilters({
                      ...filters,
                      include_deleted: e.target.checked,
                    });
                    setRefreshTrigger((prev) => prev + 1);
                  }}
                  className="rounded border-gray-600 bg-gray-900 text-blue-500"
                />
                <span>Include deleted</span>
              </label>
            </div>
          </div>
        </div>
      )}

      <PaginatedTable
        apiCall={(params) =>
          adminApi.getVmIpAssignments({ ...params, ...getApiFilters() })
        }
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view IP assignments"
        loadingMessage="Loading IP assignments..."
        dependencies={[refreshTrigger, filters]}
        minWidth="1400px"
      />

      {/* Edit IP Assignment Modal */}
      {selectedAssignment && (
        <EditIpAssignmentModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

// Edit IP Assignment Modal Component
function EditIpAssignmentModal({
  isOpen,
  onClose,
  assignment,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  assignment: AdminVmIpAssignmentInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    ip: assignment.ip,
    arp_ref: assignment.arp_ref || "",
    dns_forward: assignment.dns_forward || "",
    dns_reverse: assignment.dns_reverse || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updates = {
        ip: formData.ip,
        arp_ref: formData.arp_ref || null,
        dns_forward: formData.dns_forward || null,
        dns_reverse: formData.dns_reverse || null,
      };

      await adminApi.updateVmIpAssignment(assignment.id, updates);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update IP assignment:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update IP assignment",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit IP Assignment"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">VM:</span>
              <span className="text-white ml-2">
                {`VM-${assignment.vm_id}`}
              </span>
            </div>
            <div>
              <span className="text-gray-400">IP Range:</span>
              <span className="text-white ml-2 font-mono">
                {assignment.ip_range_cidr}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            IP Address *
          </label>
          <input
            type="text"
            value={formData.ip}
            onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
            className="font-mono"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Forward DNS (Optional)
            </label>
            <input
              type="text"
              value={formData.dns_forward}
              onChange={(e) =>
                setFormData({ ...formData, dns_forward: e.target.value })
              }
              className=""
              placeholder="host.example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Reverse DNS (Optional)
            </label>
            <input
              type="text"
              value={formData.dns_reverse}
              onChange={(e) =>
                setFormData({ ...formData, dns_reverse: e.target.value })
              }
              className=""
              placeholder="host.example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            ARP Reference (Optional)
          </label>
          <input
            type="text"
            value={formData.arp_ref}
            onChange={(e) =>
              setFormData({ ...formData, arp_ref: e.target.value })
            }
            className=""
            placeholder="External ARP reference ID"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Assignment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
