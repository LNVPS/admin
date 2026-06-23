import { ArrowLeftIcon, ArrowsRightLeftIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { ErrorState } from "../components/ErrorState";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useToast } from "../hooks/useToast";
import type { AdminBgpSessionInfo } from "../lib/api";

export function RouterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const routerId = id ? Number.parseInt(id, 10) : Number.NaN;
  const adminApi = useAdminApi();
  const { success, error: toastError } = useToast();
  const [togglingId, setTogglingId] = useState<number | null>(null);

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
  } = useApiCall(() => adminApi.getRouterTunnels(routerId), [routerId]);
  const tunnels = tunnelsData
    ? [...tunnelsData].sort((a, b) => a.name.localeCompare(b.name))
    : tunnelsData;

  const {
    data: sessionsData,
    loading: sessionsLoading,
    error: sessionsError,
    retry: retrySessions,
  } = useApiCall(() => adminApi.getBgpSessions(routerId), [routerId]);
  const sessions = sessionsData
    ? [...sessionsData].sort((a, b) => a.name.localeCompare(b.name))
    : sessionsData;

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
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Kind</th>
                  <th className="px-4 py-2">Local</th>
                  <th className="px-4 py-2">Remote</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tunnels.map((tunnel) => (
                  <tr key={tunnel.id}>
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
                  </tr>
                ))}
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
                  <th className="px-4 py-2" title="Administrative state — whether the session is configured on (not shut down)">
                    Admin
                  </th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-4 py-2 font-medium text-white">{session.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-300">
                      {session.peer_ip ?? "—"}
                    </td>
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
                          session.enabled
                            ? undefined
                            : "border border-slate-600 bg-slate-700/40 text-slate-400"
                        }
                      >
                        {session.enabled ? "Enabled" : "Disabled"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant={session.enabled ? "secondary" : "primary"}
                        disabled={togglingId === session.id}
                        onClick={() => handleToggleSession(session)}
                        title={
                          session.enabled
                            ? "Administratively shut down this session (sets Admin = Disabled). Does not change the live BGP state directly."
                            : "Administratively enable this session (sets Admin = Enabled). The peer must still come up before BGP State becomes Established."
                        }
                      >
                        {togglingId === session.id
                          ? "..."
                          : session.enabled
                            ? "Disable"
                            : "Enable"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
