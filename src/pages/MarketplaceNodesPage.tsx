import {
  ArrowPathIcon,
  CheckBadgeIcon,
  CheckIcon,
  ClockIcon,
  FingerPrintIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "../components/Button";
import { countActiveFilters, FilterBar, FilterButton, type FilterField } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useCachedRegions } from "../hooks/useCachedRegions";
import type {
  AdminMarketplaceNodeInfo,
  AdminMarketplaceNodeStatus,
  MarketplaceNodeStatus,
  MarketplaceTrustTier,
} from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";

const _STATUS_ORDER: Record<MarketplaceNodeStatus, number> = {
  pending: 0,
  approved: 1,
  suspended: 2,
  draining: 3,
};

/** Colours for a node lifecycle state, distinct from the generic status badge. */
const STATUS_CLASS: Record<MarketplaceNodeStatus, string> = {
  pending: "border border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  approved: "border border-green-500/40 bg-green-500/10 text-green-300",
  suspended: "border border-red-500/40 bg-red-500/10 text-red-300",
  draining: "border border-orange-500/40 bg-orange-500/10 text-orange-300",
};

const TIER_CLASS: Record<MarketplaceTrustTier, string> = {
  untrusted: "border border-slate-600 bg-slate-700/40 text-slate-300",
  verified: "border border-blue-500/40 bg-blue-500/10 text-blue-300",
  partner: "border border-purple-500/40 bg-purple-500/10 text-purple-300",
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function MarketplaceNodesPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"" | MarketplaceNodeStatus>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [approving, setApproving] = useState<AdminMarketplaceNodeInfo | null>(null);
  const [statusNode, setStatusNode] = useState<AdminMarketplaceNodeInfo | null>(null);
  const [nodeStatus, setNodeStatus] = useState<AdminMarketplaceNodeStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const filterFields: FilterField[] = [
    {
      key: "status",
      kind: "select",
      label: "Status",
      value: statusFilter,
      onChange: (v) => setStatusFilter(v as "" | MarketplaceNodeStatus),
      options: [
        { value: "", label: "All statuses" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "suspended", label: "Suspended" },
        { value: "draining", label: "Draining" },
      ],
    },
  ];

  const openStatus = async (node: AdminMarketplaceNodeInfo) => {
    setStatusNode(node);
    setNodeStatus(null);
    setStatusError(null);
    setStatusLoading(true);
    try {
      const status = await adminApi.getMarketplaceNodeStatus(node.id);
      setNodeStatus(status);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to reach node");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSuspend = async (node: AdminMarketplaceNodeInfo) => {
    if (
      !(await confirmDialog({
        title: "Suspend Node",
        message: `Suspend "${node.name}"? Its backing host is disabled immediately, so no new placement lands on it.`,
      }))
    ) {
      return;
    }
    setActionLoading(true);
    try {
      await adminApi.updateMarketplaceNode(node.id, { status: "suspended" });
      toastService.success("Node suspended", `"${node.name}" will take no new placements.`);
      refreshData();
    } catch (err) {
      toastService.error("Failed to suspend node", err instanceof Error ? err.message : undefined);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDrain = async (node: AdminMarketplaceNodeInfo) => {
    if (
      !(await confirmDialog({
        title: "Drain Node",
        message: `Drain "${node.name}"? Placement stops now and existing VMs are drained before it is decommissioned.`,
      }))
    ) {
      return;
    }
    setActionLoading(true);
    try {
      await adminApi.updateMarketplaceNode(node.id, { status: "draining" });
      toastService.success("Node draining", `"${node.name}" is being drained.`);
      refreshData();
    } catch (err) {
      toastService.error("Failed to drain node", err instanceof Error ? err.message : undefined);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async (node: AdminMarketplaceNodeInfo) => {
    // Resuming means re-approving (the only path back into `approved`).
    setApproving(node);
  };

  const handleDelete = async (node: AdminMarketplaceNodeInfo) => {
    if (
      !(await confirmDialog({
        title: "Reject / Remove Node",
        message: `Delete the registration for "${node.name}"? An operator whose hardware is turned away can re-register after fixing the problem.`,
        confirmText: "Delete registration",
      }))
    ) {
      return;
    }
    setActionLoading(true);
    try {
      await adminApi.deleteMarketplaceNode(node.id);
      toastService.success("Node registration deleted");
      refreshData();
    } catch (err) {
      toastService.error("Failed to delete node", err instanceof Error ? err.message : undefined);
    } finally {
      setActionLoading(false);
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Node</th>
      <th>Operator</th>
      <th>Trust Tier</th>
      <th>Listing Fee</th>
      <th>Host</th>
      <th>Status</th>
      <th>Last Seen</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (node: AdminMarketplaceNodeInfo, index: number) => (
    <tr key={node.id || index}>
      <td className="whitespace-nowrap align-top text-white">{node.id}</td>
      <td className="align-top">
        <div className="min-w-0 max-w-[16rem]">
          <div className="truncate font-medium text-white" title={node.name}>
            {node.name}
          </div>
          {node.tls_fingerprint ? (
            <div className="mt-1 flex items-center gap-1">
              <FingerPrintIcon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
              <span className="truncate font-mono text-[11px] text-gray-500" title={node.tls_fingerprint}>
                {node.tls_fingerprint.slice(0, 24)}…
              </span>
            </div>
          ) : (
            <div className="mt-1 text-[11px] text-red-400/80">No pinned certificate — cannot be approved</div>
          )}
        </div>
      </td>
      <td className="align-top">
        <div className="min-w-0 max-w-[14rem]">
          <div className="truncate font-mono text-xs text-gray-400" title={node.operator_pubkey}>
            {node.operator_pubkey.slice(0, 16)}…
          </div>
          <div className="text-[11px] text-gray-500">user #{node.operator_user_id}</div>
        </div>
      </td>
      <td className="align-top">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${TIER_CLASS[node.trust_tier]}`}
        >
          {node.trust_tier}
        </span>
      </td>
      <td className="align-top">
        {node.fee_paid ? (
          <StatusBadge status="active">Paid</StatusBadge>
        ) : (
          <StatusBadge status="warning">Unpaid</StatusBadge>
        )}
      </td>
      <td className="align-top text-gray-300">{node.host_id !== null ? `#${node.host_id}` : "—"}</td>
      <td className="align-top">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_CLASS[node.status]}`}
        >
          {node.status}
        </span>
      </td>
      <td className="align-top whitespace-nowrap text-gray-400">{formatDateTime(node.last_seen)}</td>
      <td className="text-right align-top">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" title="Live status" onClick={() => openStatus(node)}>
            <ShieldCheckIcon className="h-4 w-4" />
          </Button>
          {node.status === "pending" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-green-400 hover:text-green-300"
              title="Approve"
              onClick={() => setApproving(node)}
              disabled={!node.tls_fingerprint}
            >
              <CheckBadgeIcon className="h-4 w-4" />
            </Button>
          )}
          {node.status === "approved" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-orange-400 hover:text-orange-300"
                title="Drain"
                onClick={() => handleDrain(node)}
              >
                <PauseCircleIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300"
                title="Suspend"
                onClick={() => handleSuspend(node)}
              >
                <PlayCircleIcon className="h-4 w-4" />
              </Button>
            </>
          )}
          {(node.status === "suspended" || node.status === "draining") && (
            <Button
              variant="ghost"
              size="sm"
              className="text-green-400 hover:text-green-300"
              title="Resume (re-approve)"
              onClick={() => handleResume(node)}
            >
              <ArrowPathIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            title="Reject / remove registration"
            onClick={() => handleDelete(node)}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <ServerStackIcon className="mx-auto h-12 w-12 text-gray-600" />
      <h3 className="mt-2 text-sm font-medium text-gray-300">No marketplace nodes</h3>
      <p className="mt-1 text-sm text-gray-500">
        {statusFilter
          ? `No nodes are currently "${statusFilter}".`
          : "Operator-registered hardware appears here for review once listed."}
      </p>
    </div>
  );

  const calculateStats = (nodes: AdminMarketplaceNodeInfo[], totalItems: number) => {
    const pending = nodes.filter((n) => n.status === "pending").length;
    const approved = nodes.filter((n) => n.status === "approved").length;
    const suspended = nodes.filter((n) => n.status === "suspended" || n.status === "draining").length;
    const reviewable = pending;

    return (
      <StatsHeader
        title="Marketplace Nodes"
        subtitle="Operator-run compute nodes. Review pending hardware, then approve it into the fleet."
        stats={[
          { label: "Total", value: totalItems },
          { label: "Review queue", value: reviewable, tone: "warning" },
          { label: "Approved", value: approved, tone: "success" },
          { label: "Suspended/Draining", value: suspended, tone: "danger" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <FilterButton
              open={filtersOpen}
              activeCount={countActiveFilters(filterFields)}
              onClick={() => setFiltersOpen((o) => !o)}
            />
            <Button variant="secondary" onClick={refreshData}>
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) =>
          adminApi.getMarketplaceNodes({
            ...params,
            status: statusFilter || undefined,
          })
        }
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        toolbar={
          <FilterBar
            open={filtersOpen}
            fields={filterFields}
            onClear={() => setStatusFilter("")}
            onClose={() => setFiltersOpen(false)}
          />
        }
        itemsPerPage={20}
        errorAction="view marketplace nodes"
        loadingMessage="Loading marketplace nodes..."
        dependencies={[refreshTrigger, statusFilter]}
        minWidth="1100px"
      />

      {approving && (
        <ApproveNodeModal
          node={approving}
          onClose={() => setApproving(null)}
          onSuccess={() => {
            setApproving(null);
            toastService.success("Node approved", `"${approving.name}" now takes placements.`);
            refreshData();
          }}
        />
      )}

      {statusNode && (
        <Modal isOpen={true} onClose={() => setStatusNode(null)} title={`Live status — ${statusNode.name}`} size="2xl">
          {statusLoading ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
              <span className="text-sm text-slate-400">Contacting node…</span>
            </div>
          ) : statusError ? (
            <div className="bg-red-900/20 border border-red-900 rounded-lg p-4 text-sm text-red-300">{statusError}</div>
          ) : nodeStatus ? (
            <NodeStatusView status={nodeStatus} />
          ) : null}
        </Modal>
      )}

      {actionLoading && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
        </div>
      )}
    </div>
  );
}

function NodeStatusView({ status }: { status: AdminMarketplaceNodeStatus }) {
  const plane = status.dataplane;
  const fw = plane.firewall;

  const dataplane: Array<[string, boolean | number | string]> = [
    ["Tunnel up", plane.tunnel_up],
    ["Tunnel MTU", plane.tunnel_mtu ?? 0],
    ["Bridge up", plane.bridge_up],
    ["IPv4 forwarding", plane.forwarding4],
    ["IPv6 forwarding", plane.forwarding6],
    ["Routed guests", plane.routed_guests],
  ];

  const firewall: Array<[string, boolean | number | string]> = [
    ["nftables available", fw.available],
    ["Ruleset loaded", fw.present],
    ["Layer-2 isolation", fw.isolated],
    ["Guest bindings", fw.bindings],
    ["Spoofed packets dropped", fw.spoofed_packets],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border border-blue-500/40 bg-blue-500/10 text-blue-300">
          <ClockIcon className="h-3.5 w-3.5" />
          daemon v{status.version}
        </span>
        {plane.last_handshake_secs !== null && plane.last_handshake_secs !== undefined ? (
          <StatusBadge status="active">Handshake {plane.last_handshake_secs}s ago</StatusBadge>
        ) : (
          <StatusBadge status="warning">No handshake yet</StatusBadge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusGrid title="Data plane" rows={dataplane} />
        <StatusGrid title="Packet filter" rows={firewall} />
      </div>

      {fw.ruleset && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <FingerPrintIcon className="h-4 w-4 shrink-0 text-gray-500" />
          Kernel ruleset tag: <span className="font-mono text-gray-300">{fw.ruleset}</span>
        </div>
      )}
    </div>
  );
}

function StatusGrid({ title, rows }: { title: string; rows: Array<[string, boolean | number | string]> }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</div>
      <dl className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-sm text-slate-400">{label}</dt>
            <dd className="flex items-center gap-1.5 text-sm text-white">
              {typeof value === "boolean" ? (
                <>
                  <CheckIcon className={`h-4 w-4 ${value ? "text-green-400" : "text-red-400"}`} />
                  {value ? "yes" : "no"}
                </>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ApproveNodeModal({
  node,
  onClose,
  onSuccess,
}: {
  node: AdminMarketplaceNodeInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const { data: regions } = useCachedRegions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    region_id: number;
    name: string;
    trust_tier: MarketplaceTrustTier;
    cpu: number;
    memory: number;
  }>({
    region_id: 0,
    name: node.name,
    trust_tier: "untrusted",
    cpu: 0,
    memory: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await adminApi.approveMarketplaceNode(node.id, {
        region_id: formData.region_id,
        name: formData.name.trim() || undefined,
        trust_tier: formData.trust_tier,
        cpu: formData.cpu,
        memory: formData.memory,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve node");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Approve node — ${node.name}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!node.fee_paid && (
          <div className="bg-yellow-900/20 border border-yellow-900 rounded-lg p-3 text-sm text-yellow-300">
            The listing fee is not paid. Approval will be refused if the region's company charges one.
          </div>
        )}
        {!node.tls_fingerprint && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-sm text-red-300">
            This node has no pinned TLS certificate and cannot be reached. Approval will be refused.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Region *</label>
          <select
            value={formData.region_id || ""}
            onChange={(e) => setFormData({ ...formData, region_id: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            required
          >
            <option value="">Select a region…</option>
            {regions?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">The backing host is created here. Required on first approval.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Host name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="e.g. operator-rack-1"
          />
          <p className="text-xs text-gray-400 mt-1">Defaults to the operator's own label for the node.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Trust tier</label>
          <select
            value={formData.trust_tier}
            onChange={(e) => setFormData({ ...formData, trust_tier: e.target.value as MarketplaceTrustTier })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="untrusted">Untrusted</option>
            <option value="verified">Verified</option>
            <option value="partner">Partner</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">CPU cores</label>
            <input
              type="number"
              value={formData.cpu}
              onChange={(e) => setFormData({ ...formData, cpu: Number(e.target.value) })}
              min={0}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Total cores the host may sell. 0 = takes nothing.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Memory (bytes)</label>
            <input
              type="number"
              value={formData.memory}
              onChange={(e) => setFormData({ ...formData, memory: Number(e.target.value) })}
              min={0}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Total memory the host may sell. 0 = takes nothing.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={submitting || !node.tls_fingerprint} className="flex-1">
            {submitting ? "Approving…" : "Approve node"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
