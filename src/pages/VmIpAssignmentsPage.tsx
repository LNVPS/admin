import { GlobeAltIcon, PencilIcon, ServerIcon, TrashIcon } from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { countActiveFilters, FilterBar, FilterButton, type FilterField } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminIpRangeInfo, AdminVmIpAssignmentInfo } from "../lib/api";
import { confirmDialog } from "../services/confirmService";

export function VmIpAssignmentsPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AdminVmIpAssignmentInfo | null>(null);
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
    if (filters.ip_range_id) apiFilters.ip_range_id = parseInt(filters.ip_range_id);
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

  const updateFilter = (key: keyof typeof filters, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setRefreshTrigger((prev) => prev + 1);
  };

  const filterFields: FilterField[] = [
    {
      kind: "number",
      key: "vm_id",
      label: "VM ID",
      value: filters.vm_id,
      placeholder: "Enter VM ID",
      onChange: (value) => updateFilter("vm_id", value),
    },
    {
      kind: "select",
      key: "region_id",
      label: "Region",
      value: filters.region_id,
      onChange: (value) => updateFilter("region_id", value),
      options: [
        { value: "", label: "All regions" },
        ...regions.map((region) => ({ value: String(region.id), label: region.name })),
      ],
    },
    {
      kind: "select",
      key: "ip_range_id",
      label: "IP Range",
      value: filters.ip_range_id,
      onChange: (value) => updateFilter("ip_range_id", value),
      options: [
        { value: "", label: "All IP ranges" },
        ...ipRanges
          .filter((range) => !filters.region_id || range.region_id.toString() === filters.region_id)
          .map((range) => ({ value: String(range.id), label: `${range.cidr} (${range.region_name})` })),
      ],
    },
    {
      kind: "text",
      key: "ip",
      label: "IP Address",
      value: filters.ip,
      placeholder: "192.168.1.100",
      onChange: (value) => updateFilter("ip", value),
    },
    {
      kind: "checkbox",
      key: "include_deleted",
      label: "Include deleted",
      value: filters.include_deleted,
      onChange: (value) => updateFilter("include_deleted", value),
    },
  ];

  const handleEdit = (assignment: AdminVmIpAssignmentInfo) => {
    setSelectedAssignment(assignment);
    setShowEditModal(true);
  };

  const handleDelete = async (assignment: AdminVmIpAssignmentInfo) => {
    if (
      await confirmDialog({
        title: "Delete IP Assignment",
        message: `Are you sure you want to delete IP assignment "${assignment.ip}"?`,
      })
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
      <th>VM &amp; Range</th>
      <th>DNS</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (assignment: AdminVmIpAssignmentInfo, index: number) => (
    <tr key={assignment.id || index}>
      <td className="whitespace-nowrap align-top text-white">{assignment.id}</td>
      <td className="align-top">
        <div className="min-w-0 max-w-[16rem]">
          <Link
            to={`/ip-address/${encodeURIComponent(assignment.ip)}`}
            className="block truncate font-mono font-medium text-blue-400 hover:text-blue-300 hover:underline"
            title={assignment.ip}
          >
            {assignment.ip}
          </Link>
          {assignment.arp_ref && (
            <div className="mt-0.5 truncate font-mono text-xs text-gray-400" title={assignment.arp_ref}>
              ARP: {assignment.arp_ref}
            </div>
          )}
        </div>
      </td>
      <td className="align-top">
        <div className="min-w-0 max-w-[18rem]">
          <div className="flex items-center">
            <ServerIcon className="h-4 w-4 mr-1 shrink-0 text-gray-400" />
            <Link
              to={`/vms/${assignment.vm_id}`}
              className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
            >
              VM #{assignment.vm_id}
            </Link>
          </div>
          <div className="mt-0.5 truncate text-xs" title={assignment.ip_range_cidr || undefined}>
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
                className="max-w-full truncate font-mono text-blue-400 hover:text-blue-300 hover:underline"
                title={`Filter by IP range ${assignment.ip_range_cidr}`}
              >
                {assignment.ip_range_cidr}
              </button>
            ) : (
              <span className="font-mono text-gray-500">No range</span>
            )}
          </div>
          <div className="mt-0.5 flex items-center text-xs text-gray-400">
            <GlobeAltIcon className="h-3.5 w-3.5 mr-1 shrink-0 text-gray-500" />
            <span className="truncate" title={assignment.region_name || "N/A"}>
              {assignment.region_name || "N/A"}
            </span>
          </div>
        </div>
      </td>
      <td className="align-top">
        <div className="min-w-0 max-w-[14rem] space-y-0.5">
          {assignment.dns_forward && (
            <div className="truncate text-xs text-blue-400" title={assignment.dns_forward}>
              ↗ {assignment.dns_forward}
            </div>
          )}
          {assignment.dns_reverse && (
            <div className="truncate text-xs text-green-400" title={assignment.dns_reverse}>
              ↙ {assignment.dns_reverse}
            </div>
          )}
          {!assignment.dns_forward && !assignment.dns_reverse && <span className="text-gray-500">None</span>}
        </div>
      </td>
      <td className="align-top">
        <StatusBadge status={assignment.deleted ? "inactive" : "active"} />
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="secondary" onClick={() => handleEdit(assignment)} className="p-1">
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

  const calculateStats = (assignments: AdminVmIpAssignmentInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      active: assignments.filter((assignment) => !assignment.deleted).length,
      withForwardDns: assignments.filter((assignment) => assignment.dns_forward).length,
      withReverseDns: assignments.filter((assignment) => assignment.dns_reverse).length,
    };

    return (
      <StatsHeader
        title="VM IP Assignments"
        stats={[
          { label: "Total", value: stats.total },
          { label: "Active", value: stats.active, tone: "success" },
          { label: "Forward DNS", value: stats.withForwardDns, tone: "accent" },
          { label: "Reverse DNS", value: stats.withReverseDns, tone: "purple" },
        ]}
        actions={
          <FilterButton
            open={showFilters}
            activeCount={countActiveFilters(filterFields)}
            onClick={() => setShowFilters(!showFilters)}
          />
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getVmIpAssignments({ ...params, ...getApiFilters() })}
        toolbar={
          <FilterBar
            open={showFilters}
            fields={filterFields}
            onClear={clearFilters}
            onClose={() => setShowFilters(false)}
          />
        }
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view IP assignments"
        loadingMessage="Loading IP assignments..."
        dependencies={[refreshTrigger, filters]}
        minWidth="850px"
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
      setError(err instanceof Error ? err.message : "Failed to update IP assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit IP Assignment" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}

        <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">VM:</span>
              <span className="text-white ml-2">{`VM-${assignment.vm_id}`}</span>
            </div>
            <div>
              <span className="text-gray-400">IP Range:</span>
              <span className="text-white ml-2 font-mono">{assignment.ip_range_cidr}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">IP Address *</label>
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
            <label className="block text-xs font-medium text-white mb-2">Forward DNS (Optional)</label>
            <input
              type="text"
              value={formData.dns_forward}
              onChange={(e) => setFormData({ ...formData, dns_forward: e.target.value })}
              className=""
              placeholder="host.example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Reverse DNS (Optional)</label>
            <input
              type="text"
              value={formData.dns_reverse}
              onChange={(e) => setFormData({ ...formData, dns_reverse: e.target.value })}
              className=""
              placeholder="host.example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">ARP Reference (Optional)</label>
          <input
            type="text"
            value={formData.arp_ref}
            onChange={(e) => setFormData({ ...formData, arp_ref: e.target.value })}
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
