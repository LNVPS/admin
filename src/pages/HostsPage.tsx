import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { Pill } from "../components/Pill";
import { AdminHostInfo } from "../lib/api";
import { formatBytes } from "../utils/formatBytes";

export function HostsPage() {
  const adminApi = useAdminApi();

  const renderHeader = () => (
    <>
      <th>ID</th>
      <th>Host Details</th>
      <th>Region</th>
      <th>Resources</th>
      <th>Disks</th>
      <th>Load Factors</th>
      <th>Status</th>
    </>
  );

  const renderRow = (host: AdminHostInfo, index: number) => (
    <tr key={host.id || index}>
      <td className="whitespace-nowrap text-white">{host.id}</td>
      <td>
        <div className="space-y-1">
          <div className="font-medium text-white">{host.name}</div>
          <div>
            <Pill variant="secondary">{host.kind}</Pill>
          </div>
          {host.vlan_id && (
            <div className="text-gray-500">VLAN: {host.vlan_id}</div>
          )}
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-1">
          <div className="font-medium">{host.region.name}</div>
          <div>
            <span
              className={`inline-flex px-1.5 py-0.5 font-medium rounded ${
                host.region.enabled
                  ? "bg-green-900 text-green-300"
                  : "bg-red-900 text-red-300"
              }`}
            >
              {host.region.enabled ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div>
            <span className="font-medium">{host.cpu}</span> CPU cores
          </div>
          <div>
            <span className="font-medium">{formatBytes(host.memory)}</span> RAM
          </div>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          {host.disks.map((disk, idx) => (
            <div
              key={idx}
              className="text-gray-400 flex items-center gap-1 flex-wrap"
            >
              <span className="font-mono text-purple-400">{disk.name}</span>
              <span className="text-gray-500">{formatBytes(disk.size)}</span>
              <span className="text-gray-500">{disk.kind.toUpperCase()}</span>
              <span className="text-gray-500">
                {disk.interface.toUpperCase()}
              </span>
              {!disk.enabled && (
                <span className="inline-flex px-1 py-0.5 rounded text-red-300 bg-red-900">
                  Disabled
                </span>
              )}
            </div>
          ))}
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div>CPU: {(host.load_cpu * 100).toFixed(0)}%</div>
          <div>RAM: {(host.load_memory * 100).toFixed(0)}%</div>
          <div>Disk: {(host.load_disk * 100).toFixed(0)}%</div>
        </div>
      </td>
      <td className="whitespace-nowrap">
        <StatusBadge status={host.enabled ? "enabled" : "disabled"} />
      </td>
    </tr>
  );

  const calculateStats = (hosts: AdminHostInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      enabled: hosts.filter((host) => host.enabled).length,
      disabled: hosts.filter((host) => !host.enabled).length,
      totalCPU: hosts.reduce((sum, host) => sum + host.cpu, 0),
      totalMemory: hosts.reduce((sum, host) => sum + host.memory, 0),
      totalDisks: hosts.reduce((sum, host) => sum + host.disks.length, 0),
      totalDiskSpace: hosts.reduce(
        (sum, host) =>
          sum + host.disks.reduce((diskSum, disk) => diskSum + disk.size, 0),
        0,
      ),
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hosts</h1>
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
              CPU:{" "}
              <span className="text-blue-400 font-medium">
                {stats.totalCPU} cores
              </span>
            </span>
            <span>
              Memory:{" "}
              <span className="text-purple-400 font-medium">
                {formatBytes(stats.totalMemory)}
              </span>
            </span>
            <span>
              Disks:{" "}
              <span className="text-orange-400 font-medium">
                {stats.totalDisks} ({formatBytes(stats.totalDiskSpace)})
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PaginatedTable
      apiCall={(params) => adminApi.getHosts(params)}
      renderHeader={renderHeader}
      renderRow={renderRow}
      calculateStats={calculateStats}
      itemsPerPage={20}
      errorAction="view hosts"
      loadingMessage="Loading hosts..."
    />
  );
}
