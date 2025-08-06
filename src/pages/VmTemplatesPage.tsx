import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { AdminVmTemplateInfo } from "../lib/api";
import { bytesToGB } from "../utils/formatBytes";
import { ServerIcon } from "@heroicons/react/24/outline";

export function VmTemplatesPage() {
  const adminApi = useAdminApi();

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>Template Name</th>
      <th>Resources</th>
      <th>Storage</th>
      <th>Region</th>
      <th>Active VMs</th>
      <th>Status</th>
      <th>Info</th>
    </>
  );

  const renderRow = (template: AdminVmTemplateInfo, index: number) => (
    <tr key={template.id || index}>
      <td className="whitespace-nowrap text-white">{template.id}</td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="font-medium text-white">{template.name}</div>
          {template.cost_plan_name && (
            <div className="text-blue-400">{template.cost_plan_name}</div>
          )}
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="text-gray-300">
            <span className="font-medium">{template.cpu}</span> CPU cores
          </div>
          <div className="text-gray-300">
            <span className="font-medium">{bytesToGB(template.memory)}</span>{" "}
            RAM
          </div>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="text-gray-300">
            <span className="font-medium">{bytesToGB(template.disk_size)}</span>
          </div>
          <div className="text-gray-400">
            {template.disk_type.toUpperCase()} •{" "}
            {template.disk_interface.toUpperCase()}
          </div>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="text-white">
          {template.region_name || `Region ${template.region_id}`}
        </div>
      </td>
      <td className="text-gray-300">
        <div className="flex items-center">
          <ServerIcon className="h-4 w-4 mr-1 text-gray-400" />
          <span className="font-medium">{template.active_vm_count}</span>
        </div>
      </td>
      <td>
        <div className="space-y-1">
          <StatusBadge status={template.enabled ? "enabled" : "disabled"} />
          {template.expires && new Date(template.expires) < new Date() && (
            <div>
              <StatusBadge status="expired" />
            </div>
          )}
        </div>
      </td>
      <td>
        <div className="space-y-0.5">
          <div className="text-gray-400">
            Created: {new Date(template.created).toLocaleDateString()}
          </div>
          {template.expires && (
            <div className="text-gray-500">
              Expires: {new Date(template.expires).toLocaleDateString()}
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  const calculateStats = (
    templates: AdminVmTemplateInfo[],
    totalItems: number,
  ) => {
    const stats = {
      total: totalItems,
      enabled: templates.filter((t) => t.enabled).length,
      disabled: templates.filter((t) => !t.enabled).length,
      expired: templates.filter(
        (t) => t.expires && new Date(t.expires) < new Date(),
      ).length,
      totalActiveVMs: templates.reduce((sum, t) => sum + t.active_vm_count, 0),
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">VM Templates</h1>
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
              Expired:{" "}
              <span className="text-orange-400 font-medium">
                {stats.expired}
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
      </div>
    );
  };

  return (
    <PaginatedTable
      apiCall={(params) => adminApi.getVmTemplates(params)}
      renderHeader={renderHeader}
      renderRow={renderRow}
      calculateStats={calculateStats}
      itemsPerPage={15}
      errorAction="view VM templates"
      loadingMessage="Loading VM templates..."
    />
  );
}
