import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { AdminIpRangeInfo } from "../lib/api";
import {
  WifiIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

export function IpRangesPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (ipRange: AdminIpRangeInfo) => {
    console.log("Edit IP Range:", ipRange);
  };

  const handleDelete = async (ipRange: AdminIpRangeInfo) => {
    if (ipRange.assignment_count > 0) {
      alert(
        `Cannot delete IP range "${ipRange.cidr}" because it has ${ipRange.assignment_count} active IP assignment(s). Please remove all assignments before deleting.`,
      );
      return;
    }

    if (
      confirm(`Are you sure you want to delete IP range "${ipRange.cidr}"?`)
    ) {
      try {
        await adminApi.deleteIpRange(ipRange.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete IP range:", error);
      }
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>CIDR & Gateway</th>
      <th>Region</th>
      <th>Access Policy</th>
      <th>Allocation</th>
      <th>Assignments</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (ipRange: AdminIpRangeInfo, index: number) => (
    <tr key={ipRange.id || index}>
      <td className="whitespace-nowrap text-white">{ipRange.id}</td>
      <td>
        <div className="space-y-0.5">
          <div className="font-medium text-white font-mono">{ipRange.cidr}</div>
          <div className="text-gray-400 text-sm font-mono">
            Gateway: {ipRange.gateway}
          </div>
          {ipRange.reverse_zone_id && (
            <div className="text-gray-400 text-sm">
              Zone: {ipRange.reverse_zone_id}
            </div>
          )}
        </div>
      </td>
      <td className="text-gray-300">
        <div className="flex items-center">
          <GlobeAltIcon className="h-4 w-4 mr-1 text-gray-400" />
          {ipRange.region_name || `Region ${ipRange.region_id}`}
        </div>
      </td>
      <td className="text-gray-300">
        {ipRange.access_policy_name ? (
          <span className="text-blue-400">{ipRange.access_policy_name}</span>
        ) : (
          <span className="text-gray-500">None</span>
        )}
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="capitalize">{ipRange.allocation_mode}</div>
          {ipRange.use_full_range && (
            <div className="text-xs text-yellow-400">Full Range</div>
          )}
        </div>
      </td>
      <td className="text-gray-300">
        <span className="font-medium">{ipRange.assignment_count}</span>
      </td>
      <td>
        <StatusBadge
          status={ipRange.enabled ? "active" : "inactive"}
          variant={ipRange.enabled ? "success" : "warning"}
        />
      </td>
      <td className="text-right">
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEdit(ipRange)}
            className="p-1"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(ipRange)}
            className="text-red-400 hover:text-red-300 p-1"
            disabled={ipRange.assignment_count > 0}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <WifiIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No IP ranges found</p>
    </div>
  );

  const calculateStats = (ipRanges: AdminIpRangeInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      enabled: ipRanges.filter((range) => range.enabled).length,
      totalAssignments: ipRanges.reduce(
        (sum, range) => sum + range.assignment_count,
        0,
      ),
      withPolicies: ipRanges.filter((range) => range.access_policy_id).length,
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IP Ranges</h1>
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
              With Policies:{" "}
              <span className="text-blue-400 font-medium">
                {stats.withPolicies}
              </span>
            </span>
            <span>
              Assignments:{" "}
              <span className="text-purple-400 font-medium">
                {stats.totalAssignments}
              </span>
            </span>
          </div>
        </div>
        <Button onClick={() => console.log("Create IP Range")}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add IP Range
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getIpRanges(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view IP ranges"
        loadingMessage="Loading IP ranges..."
        dependencies={[refreshTrigger]}
        minWidth="1400px"
      />
    </div>
  );
}
