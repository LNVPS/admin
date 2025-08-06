import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { Profile } from "../components/Profile";
import { AdminVmInfo } from "../lib/api";

export function VMsPage() {
  const adminApi = useAdminApi();

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>VM Details</th>
      <th>Status</th>
      <th>Network</th>
      <th>Owner</th>
      <th>Dates</th>
    </>
  );

  const renderRow = (vmInfo: AdminVmInfo, index: number) => (
    <tr key={vmInfo.id || index}>
      <td className="whitespace-nowrap text-white">{vmInfo.id}</td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          <div className="font-medium">{vmInfo.image_name}</div>
          <div className="text-blue-400">{vmInfo.template_name}</div>
        </div>
      </td>
      <td>
        <div className="space-y-1">
          <StatusBadge
            status={
              vmInfo.status === "running"
                ? "running"
                : vmInfo.status === "stopped"
                  ? "stopped"
                  : "unknown"
            }
          >
            {vmInfo.status}
          </StatusBadge>
        </div>
      </td>
      <td className="text-gray-300">
        <div className="space-y-0.5">
          {vmInfo.ip_addresses.length > 0 ? (
            vmInfo.ip_addresses.map((ip, idx) => (
              <div key={idx}>
                <span className="font-mono">{ip.ip}</span>
              </div>
            ))
          ) : (
            <span className="text-gray-400">No IPs</span>
          )}
          <div className="text-gray-400">{vmInfo.region_name || "Unknown"}</div>
        </div>
      </td>
      <td>
        {vmInfo.user_pubkey ? (
          <Profile pubkey={vmInfo.user_pubkey} avatarSize="sm" />
        ) : (
          <span className="text-gray-400">N/A</span>
        )}
      </td>
      <td>
        <div className="space-y-0.5">
          <div className="text-gray-400">
            {new Date(vmInfo.created).toLocaleDateString()}
          </div>
          <div className="text-gray-500">
            Exp: {new Date(vmInfo.expires).toLocaleDateString()}
          </div>
        </div>
      </td>
    </tr>
  );

  const calculateStats = (vms: AdminVmInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      running: vms.filter((vm) => vm.status === "running").length,
      stopped: vms.filter((vm) => vm.status === "stopped").length,
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Virtual Machines</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total:{" "}
              <span className="text-white font-medium">{stats.total}</span>
            </span>
            <span>
              Running:{" "}
              <span className="text-green-400 font-medium">
                {stats.running}
              </span>
            </span>
            <span>
              Stopped:{" "}
              <span className="text-red-400 font-medium">{stats.stopped}</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PaginatedTable
      apiCall={(params) => adminApi.getVMs(params)}
      renderHeader={renderHeader}
      renderRow={renderRow}
      calculateStats={calculateStats}
      itemsPerPage={15}
      errorAction="view virtual machines"
      loadingMessage="Loading virtual machines..."
    />
  );
}
