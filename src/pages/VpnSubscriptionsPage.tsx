import { ChevronDownIcon, ChevronRightIcon, DevicePhoneMobileIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminVpnDeviceInfo, AdminVpnServiceInfo, AdminVpnSubscriptionInfo } from "../lib/api";
import { promptDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export function VpnSubscriptionsPage() {
  const adminApi = useAdminApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [services, setServices] = useState<AdminVpnServiceInfo[]>([]);

  const serviceFilter = searchParams.get("vpn_service_id");
  const userFilter = searchParams.get("user_id");

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getVpnServices({ limit: 100 })
      .then((response) => {
        if (!cancelled) setServices(response.data);
      })
      .catch(() => {
        // The filter is a convenience; the table still loads without it.
      });
    return () => {
      cancelled = true;
    };
  }, [adminApi]);

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRevoke = async (plan: AdminVpnSubscriptionInfo, device: AdminVpnDeviceInfo) => {
    const reason = await promptDialog({
      title: `Revoke "${device.name}"`,
      message:
        "The device's keypair is deleted and every interface on the service is re-pushed, so the key stops working everywhere. The slot is freed immediately, so the customer can register a replacement.",
      label: "Reason (written to the log)",
      placeholder: "e.g. laptop reported stolen",
      confirmText: "Revoke device",
    });
    if (reason === null) return;

    try {
      await adminApi.revokeVpnDevice(plan.id, device.id, reason.trim() || undefined);
      toastService.success("Device revoked", "Every region is being re-pushed without it.");
      refreshData();
    } catch (err) {
      toastService.error("Failed to revoke device", err instanceof Error ? err.message : undefined);
    }
  };

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const renderHeader = () => (
    <>
      <th className="w-10" />
      <th className="w-16">ID</th>
      <th>Service</th>
      <th>User</th>
      <th>Devices</th>
      <th>Billing</th>
      <th>Expires</th>
      <th>Created</th>
    </>
  );

  const renderRow = (plan: AdminVpnSubscriptionInfo, index: number) => {
    const isExpanded = expanded.has(plan.id);
    return [
      <tr key={plan.id || index} className="cursor-pointer" onClick={() => toggleExpanded(plan.id)}>
        <td className="align-top text-gray-400">
          {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        </td>
        <td className="whitespace-nowrap align-top text-white">{plan.id}</td>
        <td className="align-top">
          <div className="truncate max-w-[14rem] text-white" title={plan.vpn_service_name}>
            {plan.vpn_service_name}
          </div>
          <div className="text-[11px] text-gray-500">Service #{plan.vpn_service_id}</div>
        </td>
        <td className="align-top">
          <Link
            to={`/users/${plan.user_id}`}
            className="text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            #{plan.user_id}
          </Link>
        </td>
        <td className="align-top text-gray-300 tabular-nums">
          {plan.devices.length} / {plan.device_limit}
        </td>
        <td className="align-top">
          {plan.active ? (
            <StatusBadge status="active">Paid</StatusBadge>
          ) : (
            <StatusBadge status="expired">Unpaid</StatusBadge>
          )}
          <div className="mt-0.5 text-[11px] text-gray-500">
            <Link
              to={`/subscriptions?user_id=${plan.user_id}`}
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
              title="The subscription line item that bills for this plan"
            >
              Line item #{plan.subscription_line_item_id}
            </Link>
          </div>
        </td>
        <td className="align-top text-gray-300">{plan.expires ? formatDateTime(plan.expires) : "—"}</td>
        <td className="align-top text-gray-400">{formatDateTime(plan.created)}</td>
      </tr>,
      isExpanded && (
        <tr key={`${plan.id}-devices`}>
          <td colSpan={8} className="bg-slate-900/60 px-6 py-4">
            <DeviceList plan={plan} onRevoke={(device) => handleRevoke(plan, device)} />
          </td>
        </tr>
      ),
    ];
  };

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <DevicePhoneMobileIcon className="mx-auto h-12 w-12 text-gray-600" />
      <h3 className="mt-2 text-sm font-medium text-gray-300">No VPN plans</h3>
      <p className="mt-1 text-sm text-gray-500">
        A plan exists because a line item was paid for, so there is nothing to create here.
      </p>
    </div>
  );

  const calculateStats = (plans: AdminVpnSubscriptionInfo[], totalItems: number) => {
    const paid = plans.filter((p) => p.active).length;
    const devices = plans.reduce((sum, p) => sum + p.devices.length, 0);

    return (
      <StatsHeader
        title="VPN Subscriptions"
        subtitle="Customer plans and the devices registered against them. Read and revoke: a device is a keypair whose private half never leaves the customer's machine."
        stats={[
          { label: "Plans", value: totalItems },
          { label: "Paid (this page)", value: paid, tone: "success" },
          { label: "Devices (this page)", value: devices, tone: "accent" },
        ]}
      />
    );
  };

  const toolbar = (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="vpn-service-filter">
          Service
        </label>
        <select
          id="vpn-service-filter"
          value={serviceFilter ?? ""}
          onChange={(e) => setFilter("vpn_service_id", e.target.value)}
          className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
        >
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="vpn-user-filter">
          User ID
        </label>
        <input
          id="vpn-user-filter"
          type="number"
          value={userFilter ?? ""}
          onChange={(e) => setFilter("user_id", e.target.value)}
          className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm w-32"
          placeholder="Any"
        />
      </div>
      {(serviceFilter || userFilter) && (
        <Button variant="secondary" size="sm" onClick={() => setSearchParams(new URLSearchParams())}>
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) =>
          adminApi.getVpnSubscriptions({
            ...params,
            vpn_service_id: serviceFilter ? Number(serviceFilter) : undefined,
            user_id: userFilter ? Number(userFilter) : undefined,
          })
        }
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        toolbar={toolbar}
        itemsPerPage={20}
        errorAction="view VPN subscriptions"
        loadingMessage="Loading VPN plans..."
        dependencies={[refreshTrigger, serviceFilter, userFilter]}
        minWidth="1100px"
      />
    </div>
  );
}

/** The devices on one plan, with the addresses they hold in every region. */
function DeviceList({
  plan,
  onRevoke,
}: {
  plan: AdminVpnSubscriptionInfo;
  onRevoke: (device: AdminVpnDeviceInfo) => void;
}) {
  if (plan.devices.length === 0) {
    return <p className="text-sm text-gray-500">No devices registered. The customer has {plan.device_limit} slots.</p>;
  }

  return (
    <div className="space-y-2">
      {!plan.active && (
        <p className="text-xs text-amber-400">
          This plan is unpaid, so none of these devices are configured on any interface. They keep their addresses and
          come back on payment.
        </p>
      )}
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left font-medium py-1">Slot</th>
            <th className="text-left font-medium py-1">Name</th>
            <th className="text-left font-medium py-1">Public key</th>
            <th className="text-left font-medium py-1">Addresses</th>
            <th className="text-left font-medium py-1">Status</th>
            <th className="text-left font-medium py-1">Registered</th>
            <th className="text-right font-medium py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {plan.devices.map((device) => (
            <tr key={device.id} className="border-t border-slate-800">
              <td className="py-1.5 text-gray-400 tabular-nums">{device.slot}</td>
              <td className="py-1.5 text-white max-w-[12rem] truncate" title={device.name}>
                {device.name}
              </td>
              <td className="py-1.5 font-mono text-[11px] text-gray-400" title={device.public_key ?? ""}>
                {device.public_key ? `${device.public_key.slice(0, 16)}…` : "—"}
              </td>
              <td className="py-1.5 font-mono text-[11px] text-gray-400">
                <div>{device.address4 ?? "—"}</div>
                <div>{device.address6 ?? "—"}</div>
              </td>
              <td className="py-1.5">
                {device.enabled ? (
                  <StatusBadge status="active">Enabled</StatusBadge>
                ) : (
                  <StatusBadge status="inactive">Disabled</StatusBadge>
                )}
              </td>
              <td className="py-1.5 text-gray-400">{formatDateTime(device.created)}</td>
              <td className="py-1.5 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  title="Revoke this device"
                  onClick={() => onRevoke(device)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
