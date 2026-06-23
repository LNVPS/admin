import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeAltIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { Fragment, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { ErrorState } from "../components/ErrorState";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import { TunnelTrafficChart } from "../components/TunnelTrafficChart";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useToast } from "../hooks/useToast";
import type { AdminBgpSessionInfo, AdminRouterTunnelInfo } from "../lib/api";

export function RouterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const routerId = id ? Number.parseInt(id, 10) : Number.NaN;
  const adminApi = useAdminApi();
  const { success, error: toastError } = useToast();
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [forcingId, setForcingId] = useState<number | null>(null);
  const [expandedTunnel, setExpandedTunnel] = useState<string | null>(null);
  const [togglingTunnel, setTogglingTunnel] = useState<string | null>(null);
  const [defaultRouteOpen, setDefaultRouteOpen] = useState(false);
  const [nextHop, setNextHop] = useState("");
  const [savingDefaultRoute, setSavingDefaultRoute] = useState(false);
  const [clearingDefaultRoute, setClearingDefaultRoute] = useState(false);
  const [settingPeerDefault, setSettingPeerDefault] = useState<string | null>(null);

  const {
    data: router,
    loading: routerLoading,
    error: routerError,
    retry: retryRouter,
  } = useApiCall(() => adminApi.getRouter(routerId), [routerId]);

  const {
    data: tunnelsData,
    loading: tunnelsLoading,
    error: tunnelsError,
    retry: retryTunnels,
  } = useApiCall(() => adminApi.getRouterTunnels(routerId), [routerId]);
  // gre0/gretap0 are the kernel's base GRE devices, not real provisioned
  // tunnels — hide them so the list only shows actual sessions.
  const HIDDEN_TUNNELS = new Set(["gre0", "gretap0"]);
  const tunnels = tunnelsData
    ? [...tunnelsData]
        .filter((t) => !HIDDEN_TUNNELS.has(t.name.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
    : tunnelsData;

  const {
    data: sessionsData,
    loading: sessionsLoading,
    error: sessionsError,
    retry: retrySessions,
  } = useApiCall(() => adminApi.getBgpSessions(routerId), [routerId]);
  const sessions = sessionsData ? [...sessionsData].sort((a, b) => a.name.localeCompare(b.name)) : sessionsData;

  const {
    data: routesData,
    loading: routesLoading,
    error: routesError,
    retry: retryRoutes,
  } = useApiCall(() => adminApi.getBgpRoutes(routerId), [routerId]);
  const routes = routesData
    ? [...routesData].sort((a, b) => {
        // Surface the default route first, then sort by prefix.
        if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
        return a.prefix.localeCompare(b.prefix);
      })
    : routesData;
  // A router can have multiple default routes — one per address family
  // (0.0.0.0/0 for IPv4 and ::/0 for IPv6). Track them all, not just the first.
  const defaultRoutes = routes?.filter((r) => r.is_default) ?? [];
  const defaultNextHops = new Set(defaultRoutes.map((r) => r.next_hop).filter((nh): nh is string => nh != null));
  const hasDefaultRoute = defaultRoutes.length > 0;

  const handleToggleTunnel = async (tunnel: AdminRouterTunnelInfo) => {
    setTogglingTunnel(tunnel.name);
    try {
      await adminApi.toggleTunnel(routerId, tunnel.name, !tunnel.enabled);
      success(`Tunnel "${tunnel.name}" ${tunnel.enabled ? "disable" : "enable"} job dispatched`);
      setTimeout(() => retryTunnels(), 1500);
    } catch (err) {
      console.error("Failed to toggle tunnel:", err);
      toastError(err instanceof Error ? err.message : "Failed to toggle tunnel");
    } finally {
      setTogglingTunnel(null);
    }
  };

  const setDefaultRouteTo = async (hop: string) => {
    await adminApi.setDefaultRoute(routerId, hop);
    success(`Default route via ${hop} job dispatched`);
    setTimeout(() => retryRoutes(), 1500);
  };

  const handleSetDefaultRoute = async () => {
    const trimmed = nextHop.trim();
    if (!trimmed) return;
    setSavingDefaultRoute(true);
    try {
      await setDefaultRouteTo(trimmed);
      setDefaultRouteOpen(false);
      setNextHop("");
    } catch (err) {
      console.error("Failed to set default route:", err);
      toastError(err instanceof Error ? err.message : "Failed to set default route");
    } finally {
      setSavingDefaultRoute(false);
    }
  };

  const handleSetDefaultRouteToPeer = async (session: AdminBgpSessionInfo) => {
    if (!session.peer_ip) return;
    setSettingPeerDefault(session.peer_ip);
    try {
      await setDefaultRouteTo(session.peer_ip);
    } catch (err) {
      console.error("Failed to set default route to peer:", err);
      toastError(err instanceof Error ? err.message : "Failed to set default route");
    } finally {
      setSettingPeerDefault(null);
    }
  };

  const handleClearDefaultRoute = async () => {
    setClearingDefaultRoute(true);
    try {
      await adminApi.clearDefaultRoute(routerId);
      success("Clear default route job dispatched");
      setTimeout(() => retryRoutes(), 1500);
    } catch (err) {
      console.error("Failed to clear default route:", err);
      toastError(err instanceof Error ? err.message : "Failed to clear default route");
    } finally {
      setClearingDefaultRoute(false);
    }
  };

  const handleToggleSession = async (session: AdminBgpSessionInfo) => {
    setTogglingId(session.id);
    try {
      // The toggle endpoint expects the backend session id (protocol name /
      // RouterOS .id), which is the `name` field — not the numeric row id.
      await adminApi.toggleBgpSession(routerId, session.name, !session.enabled);
      success(`BGP session "${session.name}" ${session.enabled ? "disable" : "enable"} job dispatched`);
      // Give the worker a moment, then refresh the cached session list
      setTimeout(() => retrySessions(), 1500);
    } catch (err) {
      console.error("Failed to toggle BGP session:", err);
      toastError(err instanceof Error ? err.message : "Failed to toggle BGP session");
    } finally {
      setTogglingId(null);
    }
  };

  // Force the router to re-issue enable/disable on a session. "up" prompts the
  // router to re-attempt the connection; "down" administratively shuts it down.
  const handleForceSession = async (session: AdminBgpSessionInfo, up: boolean) => {
    setForcingId(session.id);
    try {
      await adminApi.toggleBgpSession(routerId, session.name, up);
      success(`BGP session "${session.name}" ${up ? "enable" : "disable"} job dispatched`);
      // Give the worker a moment to apply, then refresh
      setTimeout(() => retrySessions(), 2000);
    } catch (err) {
      console.error(`Failed to force BGP session ${up ? "up" : "down"}:`, err);
      toastError(err instanceof Error ? err.message : "Failed to update BGP session");
    } finally {
      setForcingId(null);
    }
  };

  if (Number.isNaN(routerId)) {
    return <ErrorState error={new Error("Invalid router ID")} action="view this router" />;
  }

  if (routerLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-gray-400">Loading router...</div>
    );
  }

  if (routerError || !router) {
    return (
      <ErrorState error={routerError ?? new Error("Router not found")} onRetry={retryRouter} action="view routers" />
    );
  }

  const directionStyles: Record<AdminBgpSessionInfo["direction"], string> = {
    upstream: "border border-blue-500/40 bg-blue-500/10 text-blue-400",
    downstream: "border border-purple-500/40 bg-purple-500/10 text-purple-400",
    peer: "border border-green-500/40 bg-green-500/10 text-green-400",
    unknown: "border border-slate-600 bg-slate-700/40 text-slate-300",
  };

  // Operational BGP FSM state (independent of the administrative `enabled` flag).
  // Only "Established" means the session is up and exchanging routes.
  const bgpStateStyle = (state: string): string => {
    switch (state.toLowerCase()) {
      case "established":
        return "border border-green-500/40 bg-green-500/10 text-green-400";
      case "connect":
      case "active":
      case "opensent":
      case "openconfirm":
        return "border border-yellow-500/40 bg-yellow-500/10 text-yellow-400";
      case "down":
      case "idle":
        return "border border-red-500/40 bg-red-500/10 text-red-400";
      default:
        return "border border-slate-600 bg-slate-700/40 text-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/routers" className="inline-flex items-center text-sm text-gray-400 hover:text-white">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Routers
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white truncate" title={router.name}>
                {router.name}
              </h1>
              <StatusBadge status={router.enabled ? "active" : "inactive"} />
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-200 capitalize">
                {router.kind.replace(/_/g, " ")}
              </span>
            </div>
            <div className="mt-1 font-mono text-xs text-gray-400 truncate" title={router.url}>
              {router.url}
            </div>
          </div>
        </div>
      </div>

      {/* Tunnels */}
      <section className="rounded-lg border border-slate-700/60 bg-slate-800/40">
        <div className="flex items-center gap-2 border-b border-slate-700/60 px-4 py-3">
          <ArrowsRightLeftIcon className="h-5 w-5 text-gray-400" />
          <h2 className="text-base font-semibold text-white">Tunnels</h2>
          {tunnels && <span className="text-xs text-gray-400">({tunnels.length})</span>}
          <button
            type="button"
            onClick={retryTunnels}
            disabled={tunnelsLoading}
            title="Refresh tunnels"
            className="ml-auto rounded-md p-1.5 text-gray-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${tunnelsLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {tunnelsLoading ? (
          <div className="px-4 py-6 text-sm text-gray-400">Loading tunnels...</div>
        ) : tunnelsError ? (
          <div className="px-4 py-6 text-sm text-red-400">{tunnelsError.message}</div>
        ) : !tunnels || tunnels.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No tunnels discovered on this router.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700/60 text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-2 w-8" />
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Kind</th>
                  <th className="px-4 py-2">Local</th>
                  <th className="px-4 py-2">Remote</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Last Seen</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tunnels.map((tunnel) => {
                  const isExpanded = expandedTunnel === tunnel.name;
                  return (
                    <Fragment key={tunnel.id}>
                      <tr
                        className="cursor-pointer hover:bg-slate-800/40"
                        onClick={() => setExpandedTunnel(isExpanded ? null : tunnel.name)}
                      >
                        <td className="px-4 py-2 text-gray-400">
                          {isExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </td>
                        <td className="px-4 py-2 font-medium text-white">{tunnel.name}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-200 uppercase">
                            {tunnel.kind}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-300">{tunnel.local_addr ?? "—"}</td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-300">{tunnel.remote_addr ?? "—"}</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={tunnel.enabled ? "active" : "inactive"} />
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-400">
                          {tunnel.last_seen ? new Date(tunnel.last_seen).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end">
                            <Button
                              size="xs"
                              variant={tunnel.enabled ? "ghost-danger" : "ghost-success"}
                              isLoading={togglingTunnel === tunnel.name}
                              disabled={togglingTunnel === tunnel.name}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTunnel(tunnel);
                              }}
                              title={
                                tunnel.enabled
                                  ? "Administratively disable this tunnel interface (ip link set down)"
                                  : "Administratively enable this tunnel interface (ip link set up)"
                              }
                            >
                              {tunnel.enabled ? "Disable" : "Enable"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-slate-900/40">
                            <TunnelTrafficChart routerId={routerId} tunnelName={tunnel.name} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* BGP Sessions */}
      <section className="rounded-lg border border-slate-700/60 bg-slate-800/40">
        <div className="flex items-center gap-2 border-b border-slate-700/60 px-4 py-3">
          <GlobeAltIcon className="h-5 w-5 text-gray-400" />
          <h2 className="text-base font-semibold text-white">BGP Sessions</h2>
          {sessions && <span className="text-xs text-gray-400">({sessions.length})</span>}
          <button
            type="button"
            onClick={retrySessions}
            disabled={sessionsLoading}
            title="Refresh BGP sessions"
            className="ml-auto rounded-md p-1.5 text-gray-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${sessionsLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {sessionsLoading ? (
          <div className="px-4 py-6 text-sm text-gray-400">Loading BGP sessions...</div>
        ) : sessionsError ? (
          <div className="px-4 py-6 text-sm text-red-400">{sessionsError.message}</div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No BGP sessions discovered on this router.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700/60 text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Peer IP</th>
                  <th className="px-4 py-2">Peer ASN</th>
                  <th className="px-4 py-2">Local ASN</th>
                  <th className="px-4 py-2">Direction</th>
                  <th className="px-4 py-2" title="Live BGP protocol state — only Established means up">
                    BGP State
                  </th>
                  <th className="px-4 py-2 text-right">Prefixes (Rx / Tx)</th>
                  <th
                    className="px-4 py-2"
                    title="Administrative state — whether the session is configured on (not shut down)"
                  >
                    Admin
                  </th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sessions.map((session) => {
                  const isDefaultRouteSession = session.peer_ip != null && defaultNextHops.has(session.peer_ip);
                  return (
                    <tr key={session.id}>
                      <td className="px-4 py-2 font-medium text-white">
                        <span className="inline-flex items-center gap-1.5">
                          {session.name}
                          {isDefaultRouteSession && (
                            <MapPinIcon
                              className="h-4 w-4 shrink-0 text-blue-400"
                              title="Default route is via this session's peer"
                              aria-label="Default route is via this session's peer"
                            />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-300">{session.peer_ip ?? "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {session.peer_asn != null ? (
                          <a
                            href={`https://bgp.tools/as/${session.peer_asn}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 hover:underline"
                            title={`View AS${session.peer_asn} on bgp.tools`}
                          >
                            AS{session.peer_asn}
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {session.local_asn != null ? (
                          <a
                            href={`https://bgp.tools/as/${session.local_asn}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 hover:underline"
                            title={`View AS${session.local_asn} on bgp.tools`}
                          >
                            AS{session.local_asn}
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${directionStyles[session.direction]}`}
                        >
                          {session.direction}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bgpStateStyle(session.state)}`}
                          title={
                            session.state.toLowerCase() === "established"
                              ? "Session is up and exchanging routes"
                              : "Session is not up (only Established means up)"
                          }
                        >
                          {session.state}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs text-gray-300">
                        {session.prefixes_received ?? "—"} / {session.prefixes_sent ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge
                          status={session.enabled ? "enabled" : "disabled"}
                          colorOverride={
                            session.enabled ? undefined : "border border-slate-600 bg-slate-700/40 text-slate-400"
                          }
                        >
                          {session.enabled ? "Enabled" : "Disabled"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          {session.peer_ip &&
                            (isDefaultRouteSession ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400"
                                title={`Default route is via this peer (${session.peer_ip})`}
                              >
                                <MapPinIcon className="h-3.5 w-3.5" />
                                Default
                              </span>
                            ) : (
                              <Button
                                size="xs"
                                variant="ghost"
                                leftIcon={<MapPinIcon className="h-3.5 w-3.5" />}
                                isLoading={settingPeerDefault === session.peer_ip}
                                disabled={settingPeerDefault === session.peer_ip}
                                onClick={() => handleSetDefaultRouteToPeer(session)}
                                title={`Set the router's static default route to this peer (${session.peer_ip})`}
                              >
                                Set default
                              </Button>
                            ))}
                          {session.enabled && session.state.toLowerCase() !== "established" && (
                            <Button
                              size="xs"
                              variant="ghost-success"
                              isLoading={forcingId === session.id}
                              disabled={forcingId === session.id || togglingId === session.id}
                              onClick={() => handleForceSession(session, true)}
                              title="Re-issue enable to prompt the router to re-attempt the connection. Use when the session is enabled but stuck Down/Idle/Active."
                            >
                              Force up
                            </Button>
                          )}
                          {!session.enabled && session.state.toLowerCase() === "established" && (
                            <Button
                              size="xs"
                              variant="ghost-danger"
                              isLoading={forcingId === session.id}
                              disabled={forcingId === session.id || togglingId === session.id}
                              onClick={() => handleForceSession(session, false)}
                              title="Session is administratively disabled but still Established. Re-issue disable to force it down."
                            >
                              Force down
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant={session.enabled ? "ghost-danger" : "ghost-success"}
                            isLoading={togglingId === session.id}
                            disabled={togglingId === session.id || forcingId === session.id}
                            onClick={() => handleToggleSession(session)}
                            title={
                              session.enabled
                                ? "Administratively shut down this session (sets Admin = Disabled). Does not change the live BGP state directly."
                                : "Administratively enable this session (sets Admin = Enabled). The peer must still come up before BGP State becomes Established."
                            }
                          >
                            {session.enabled ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Routes */}
      <section className="rounded-lg border border-slate-700/60 bg-slate-800/40">
        <div className="flex items-center gap-2 border-b border-slate-700/60 px-4 py-3">
          <MapPinIcon className="h-5 w-5 text-gray-400" />
          <h2 className="text-base font-semibold text-white">Routes</h2>
          {routes && <span className="text-xs text-gray-400">({routes.length})</span>}
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<MapPinIcon className="h-3.5 w-3.5" />}
              onClick={() => {
                setNextHop("");
                setDefaultRouteOpen(true);
              }}
              title="Install or replace the router's static default route (IPv4 or IPv6, inferred from next-hop)"
            >
              Set default route
            </Button>
            {hasDefaultRoute && (
              <Button
                size="xs"
                variant="ghost-danger"
                isLoading={clearingDefaultRoute}
                disabled={clearingDefaultRoute}
                onClick={handleClearDefaultRoute}
                title="Remove the router's static default route"
              >
                Clear default
              </Button>
            )}
            <button
              type="button"
              onClick={retryRoutes}
              disabled={routesLoading}
              title="Refresh routes"
              className="rounded-md p-1.5 text-gray-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowPathIcon className={`h-4 w-4 ${routesLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        {routesLoading ? (
          <div className="px-4 py-6 text-sm text-gray-400">Loading routes...</div>
        ) : routesError ? (
          <div className="px-4 py-6 text-sm text-red-400">{routesError.message}</div>
        ) : !routes || routes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No routes discovered on this router.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700/60 text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-2">Prefix</th>
                  <th className="px-4 py-2">Next Hop</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {routes.map((route) => (
                  <tr key={`${route.prefix}-${route.next_hop ?? ""}`}>
                    <td className="px-4 py-2 font-mono text-xs text-white">{route.prefix}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-300">{route.next_hop ?? "—"}</td>
                    <td className="px-4 py-2">
                      {route.is_default ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-blue-500/40 bg-blue-500/10 text-blue-400">
                          Default
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">
                          Originated
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400">
                      {route.last_seen ? new Date(route.last_seen).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={defaultRouteOpen}
        onClose={() => setDefaultRouteOpen(false)}
        title="Set default route"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDefaultRouteOpen(false)} disabled={savingDefaultRoute}>
              Cancel
            </Button>
            <Button onClick={handleSetDefaultRoute} disabled={savingDefaultRoute || !nextHop.trim()}>
              {savingDefaultRoute ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label htmlFor="next-hop" className="block text-sm font-medium text-gray-300">
            Next-hop / gateway IP
          </label>
          <input
            id="next-hop"
            type="text"
            value={nextHop}
            onChange={(e) => setNextHop(e.target.value)}
            placeholder="e.g. 192.0.2.1 or 2001:db8::1"
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-slate-400">
            The address family of the default route (0.0.0.0/0 vs ::/0) is inferred from this value. The change is
            applied asynchronously by the worker.
          </p>
        </div>
      </Modal>
    </div>
  );
}
